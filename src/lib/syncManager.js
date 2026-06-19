// ============================================================================
// syncManager.js — โรงงานสร้างตัว sync Firestore แบบ debounce ที่ใช้ร่วมกัน
// ----------------------------------------------------------------------------
// สรุปการเปลี่ยนแปลง (Candidate 1 — SyncManager):
//   เดิม: มี util 3 ไฟล์ (tasks/roadmap/portfolio) ที่โครงสร้างเหมือนกันเกือบ
//         ทั้งหมด — ต่างก็ถือตัวแปร module-level ชุดเดียวกัน
//         (currentUid/subscribed/timer/suppress) และ logic debounce 1 วินาที
//         + suppress ตอน hydrate ซ้ำกันคนละสำเนา
//   ใหม่: รวม lifecycle ทั้งหมดไว้ใน createFirestoreSync() ที่เดียว ส่วนที่ต่างกัน
//         (slice ที่อ่าน, รูปร่าง doc, การเช็คว่ามีการเปลี่ยน, การ seed ครั้งแรก,
//          และ side-effect photoURL ของ portfolio) ส่งผ่าน callback เข้ามา
//   หมายเหตุ: syncSelectToFirestore ไม่ถูกรวมที่นี่ เพราะโครงสร้างต่างกันชัดเจน
//         (ไม่มี subscription/debounce, ถูกเรียกมือจาก 5 หน้า) จึงคงไว้แยกตามเดิม
//   ดังนั้นจริง ๆ รวม 3 โมดูล (ไม่ใช่ 4) — Select ยังอยู่ไฟล์เดิม
// ============================================================================
import { setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { refs } from './db'
import { useTaskStore } from '../stores/useTaskStore'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import { useUserStore } from '../stores/useUserStore'
import { useWorldStore } from '../stores/useWorldStore'

/**
 * Build a debounced Firestore sync for a single Zustand store.
 *
 * @param {object}   opts
 * @param {object}   opts.store      Zustand store (has getState/setState/subscribe)
 * @param {string}   opts.logName    prefix for console.error logging
 * @param {(state) => object} opts.toDoc     doc fields to merge-write (call serverTimestamp() here)
 * @param {(data) => object}  opts.fromDoc   store.setState updates from a Firestore doc ({} = none)
 * @param {(state, prev) => boolean} opts.changed   whether a relevant slice changed
 * @param {(data) => boolean} opts.needsSeed  whether to push local up on first migration
 * @returns {{ push(uid): Promise<void>, hydrate(uid): Promise<void>, setSyncUser(uid): void }}
 */
export function createFirestoreSync({ store, logName, toDoc, fromDoc, changed, needsSeed }) {
  let currentUid = null   // latest signed-in uid; null when logged out
  let subscribed = false  // store subscription is set up once
  let timer = null        // debounce handle for auto-sync writes
  let suppress = false    // skip auto-sync while hydrating from Firestore

  // Write the store's slice into Firestore users/{uid}; merge keeps other fields.
  async function push(uid) {
    if (!uid) return
    try {
      await setDoc(refs.user(uid), toDoc(store.getState()), { merge: true })
    } catch (error) {
      console.error(`[${logName}] push failed:`, error)
    }
  }

  // Load the slice from Firestore into the store (Firestore wins); seed on first migration.
  async function hydrate(uid) {
    if (!uid) return
    try {
      const snap = await getDoc(refs.user(uid))
      const data = snap.exists() ? snap.data() : {}

      const updates = fromDoc(data)
      if (Object.keys(updates).length > 0) {
        suppress = true
        store.setState(updates)
        suppress = false
      }

      if (needsSeed(data)) {
        await push(uid)
      }
    } catch (error) {
      console.error(`[${logName}] hydrate failed:`, error)
    }
  }

  // Set the active uid and (once) subscribe so every mutation is debounced and
  // pushed to Firestore. Pass null on logout to stop syncing.
  function setSyncUser(uid) {
    currentUid = uid
    if (!uid) clearTimeout(timer)

    if (subscribed) return
    subscribed = true
    store.subscribe((state, prev) => {
      if (suppress || !currentUid) return
      if (!changed(state, prev)) return
      clearTimeout(timer)
      timer = setTimeout(() => push(currentUid), 1000)
    })
  }

  return { push, hydrate, setSyncUser }
}

// ── Tasks ────────────────────────────────────────────────────────────────────
const tasksSync = createFirestoreSync({
  store: useTaskStore,
  logName: 'syncTasks',
  toDoc: ({ tasks, trash }) => ({ tasks, trash, tasksUpdatedAt: serverTimestamp() }),
  fromDoc: (data) => (data.tasks ? { tasks: data.tasks, trash: data.trash ?? [] } : {}),
  changed: (s, p) => s.tasks !== p.tasks || s.trash !== p.trash,
  needsSeed: (data) => !data.tasks,
})

// ── Roadmap ──────────────────────────────────────────────────────────────────
const roadmapSync = createFirestoreSync({
  store: useRoadmapStore,
  logName: 'syncRoadmap',
  toDoc: ({ nodes, edges }) => ({ roadmap: { nodes, edges }, roadmapUpdatedAt: serverTimestamp() }),
  fromDoc: (data) =>
    data.roadmap ? { nodes: data.roadmap.nodes ?? [], edges: data.roadmap.edges ?? [] } : {},
  changed: (s, p) => s.nodes !== p.nodes || s.edges !== p.edges,
  needsSeed: (data) => !data.roadmap,
})

// ── Portfolio (+ journeys, + profilePhotoURL side-effect) ─────────────────────
const portfolioSync = createFirestoreSync({
  store: useUserStore,
  logName: 'syncPortfolio',
  toDoc: ({ portfolioData, journeys }) => ({
    portfolioData,
    journeys,
    portfolioUpdatedAt: serverTimestamp(),
  }),
  fromDoc: (data) => {
    const updates = {}
    if (data.portfolioData) updates.portfolioData = data.portfolioData
    if (data.journeys) updates.journeys = data.journeys
    if (data.photoURL) updates.profilePhotoURL = data.photoURL
    return updates
  },
  changed: (s, p) => s.portfolioData !== p.portfolioData || s.journeys !== p.journeys,
  needsSeed: (data) => !data.portfolioData || !data.journeys,
})

// Re-export the original named API so existing import sites stay unchanged.
export const syncTasksToFirestore = tasksSync.push
export const hydrateTasksFromFirestore = tasksSync.hydrate
export const setTaskSyncUser = tasksSync.setSyncUser

export const syncRoadmapToFirestore = roadmapSync.push
export const hydrateRoadmapFromFirestore = roadmapSync.hydrate
export const setRoadmapSyncUser = roadmapSync.setSyncUser

export const syncPortfolioToFirestore = portfolioSync.push
export const hydratePortfolioFromFirestore = portfolioSync.hydrate
export const setPortfolioSyncUser = portfolioSync.setSyncUser

// ── Personal Map ─────────────────────────────────────────────────────────────
// Maps live at maps/{uid}, not under users/{uid}, so we use standalone
// push/hydrate functions rather than createFirestoreSync (which always writes
// to refs.user). The debounced writer is wired up in sessionBootstrap.

// ── Personal Map debounced writer ────────────────────────────────────────────
// Module-level state mirrors the createFirestoreSync lifecycle pattern but writes
// to refs.map (not refs.user), and only fires when viewing the owner's own map.
let _mapTimer = null
let _mapCurrentUid = null
let _mapSubscribed = false

export function armMapSync(uid) {
  _mapCurrentUid = uid
  if (!uid) {
    clearTimeout(_mapTimer)
    return
  }
  if (_mapSubscribed) return
  _mapSubscribed = true
  useWorldStore.subscribe((state, prev) => {
    if (!_mapCurrentUid) return
    if (state.mapObjects === prev.mapObjects) return
    if (state.currentMapOwnerUid !== _mapCurrentUid) return
    clearTimeout(_mapTimer)
    _mapTimer = setTimeout(
      () => syncMapToFirestore(_mapCurrentUid, useWorldStore.getState().mapObjects),
      1000,
    )
  })
}

export function disarmMapSync() {
  _mapCurrentUid = null
  clearTimeout(_mapTimer)
  _mapSubscribed = false
}

export async function syncMapToFirestore(uid, objects) {
  if (!uid) return
  try {
    await setDoc(refs.map(uid), { objects, mapUpdatedAt: serverTimestamp() }, { merge: true })
  } catch (e) {
    console.error('[syncMap] push failed:', e)
  }
}

export async function hydrateMapFromFirestore(uid) {
  if (!uid) return
  try {
    const snap = await getDoc(refs.map(uid))
    const data = snap.exists() ? snap.data() : {}
    if (data.objects) useWorldStore.getState().setMapObjects(data.objects)
  } catch (e) {
    console.error('[syncMap] hydrate failed:', e)
  }
}
