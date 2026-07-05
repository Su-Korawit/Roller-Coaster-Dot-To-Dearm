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
import { useInventoryStore } from '../stores/useInventoryStore'
import { useFarmStore } from '../stores/useFarmStore'

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
 * @param {(uid) => DocumentRef} [opts.ref]   doc ref factory — defaults to refs.user
 * @param {(state, uid) => boolean} [opts.guard]  extra condition checked before debouncing
 * @param {(status: 'saving'|'saved'|'error') => void} [opts.onStatus]  save-status callback, defaults to a no-op — only the roadmap instance passes one today
 * @returns {{ push(uid): Promise<void>, hydrate(uid): Promise<void>, setSyncUser(uid): void }}
 */
export function createFirestoreSync({ store, logName, toDoc, fromDoc, changed, needsSeed, ref, guard, onStatus }) {
  const getRef = ref ?? refs.user
  const emitStatus = onStatus ?? (() => {})

  let currentUid = null   // latest signed-in uid/sheetId; null when logged out/disarmed
  let subscribed = false  // store subscription is set up once
  let timer = null        // debounce handle for auto-sync writes
  let pendingTarget = null // sheet/uid the in-flight debounce was scheduled for
  let suppress = false    // skip auto-sync while hydrating from Firestore

  // Write the store's slice into the target doc; merge keeps other fields.
  async function push(target) {
    if (!target) return
    emitStatus('saving')
    try {
      await setDoc(getRef(target), toDoc(store.getState(), target), { merge: true })
      emitStatus('saved')
    } catch (error) {
      console.error(`[${logName}] push failed:`, error)
      emitStatus('error')
    }
  }

  function flushPending() {
    if (timer == null) return
    clearTimeout(timer)
    timer = null
    const target = pendingTarget ?? currentUid
    pendingTarget = null
    if (target) void push(target)
  }

  // Load the slice from Firestore into the store (Firestore wins); seed on first migration.
  async function hydrate(uid) {
    if (!uid) return
    try {
      const snap = await getDoc(getRef(uid))
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
    if (timer != null) {
      // Switching sheets/users: flush the pending write for the old target first.
      // Disarming (uid=null) or re-arming the same target cancels without writing.
      if (uid != null && uid !== currentUid) flushPending()
      else {
        clearTimeout(timer)
        timer = null
        pendingTarget = null
      }
    }
    currentUid = uid

    if (subscribed) return
    subscribed = true
    store.subscribe((state, prev) => {
      if (suppress || !currentUid) return
      if (!changed(state, prev)) return
      if (guard && !guard(state, currentUid)) return
      clearTimeout(timer)
      pendingTarget = currentUid
      timer = setTimeout(() => {
        timer = null
        const target = pendingTarget
        pendingTarget = null
        void push(target)
      }, 1000)
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

// ── Roadmap Sheets ───────────────────────────────────────────────────────────
// Sheets sync to roadmapSheets/{sheetId}; only the active non-viewer sheet is
// allowed to write through the debounced pipeline.
const roadmapSheetSync = createFirestoreSync({
  store: useRoadmapStore,
  logName: 'syncRoadmapSheet',
  ref: refs.roadmapSheet,
  toDoc: (state, sheetId) => {
    const sheet = state.sheets.find((sh) => sh.id === sheetId)
    const nodes = sheet?.nodes ?? state.nodes
    const edges = sheet?.edges ?? state.edges
    return { nodes, edges, updatedAt: serverTimestamp() }
  },
  fromDoc: (data) =>
    ('nodes' in data || 'edges' in data) ? { nodes: data.nodes ?? [], edges: data.edges ?? [] } : {},
  changed: (s, p) => s.nodes !== p.nodes || s.edges !== p.edges,
  guard: (state, sheetId) => {
    const sheet = state.sheets.find((sh) => sh.id === sheetId)
    return state.activeSheetId === sheetId && sheet?.myRole !== 'view'
  },
  needsSeed: () => false,
  onStatus: (status) => useRoadmapStore.getState().setSyncStatus(status),
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

export const pushRoadmapSheetToFirestore = roadmapSheetSync.push
export const hydrateRoadmapSheetFromFirestore = roadmapSheetSync.hydrate
export const armRoadmapSheetSync = (sheetId) => roadmapSheetSync.setSyncUser(sheetId)
export const disarmRoadmapSheetSync = () => roadmapSheetSync.setSyncUser(null)

export const syncPortfolioToFirestore = portfolioSync.push
export const hydratePortfolioFromFirestore = portfolioSync.hydrate
export const setPortfolioSyncUser = portfolioSync.setSyncUser

// ── Personal Map ─────────────────────────────────────────────────────────────
// Maps live at maps/{uid} rather than users/{uid} — use ref: refs.map.
// guard ensures the debounce only fires when viewing the owner's own map.
const mapSync = createFirestoreSync({
  store: useWorldStore,
  logName: 'syncMap',
  ref: refs.map,
  toDoc: ({ objectsByMap }) => ({ objectsByMap, mapUpdatedAt: serverTimestamp() }),
  fromDoc: (data) => {
    if (data.objectsByMap) return { objectsByMap: data.objectsByMap }
    // Back-compat: migrate an old flat `objects` array into the entry map slot.
    if (data.objects) return { objectsByMap: { test3: data.objects } }
    return {}
  },
  changed: (s, p) => s.objectsByMap !== p.objectsByMap,
  guard: (s, uid) => s.currentMapOwnerUid === uid,
  needsSeed: () => false,
})

export const armMapSync = mapSync.setSyncUser
export const disarmMapSync = () => mapSync.setSyncUser(null)

// ── Inventory + farm gold (owner-private) → users/{uid} ───────────────────────
const inventorySync = createFirestoreSync({
  store: useInventoryStore,
  logName: 'syncInventory',
  toDoc: ({ hotbar, storage, gold }) => ({
    inventory: { hotbar, storage },
    farmGold: gold,
    inventoryUpdatedAt: serverTimestamp(),
  }),
  fromDoc: (data) => {
    const updates = {}
    if (data.inventory) {
      updates.hotbar = data.inventory.hotbar ?? Array(8).fill(null)
      updates.storage = data.inventory.storage ?? Array(30).fill(null)
    }
    if (typeof data.farmGold === 'number') updates.gold = data.farmGold
    return updates
  },
  changed: (s, p) => s.hotbar !== p.hotbar || s.storage !== p.storage || s.gold !== p.gold,
  needsSeed: () => false,
})

export const hydrateInventoryFromFirestore = inventorySync.hydrate
export const setInventorySyncUser = inventorySync.setSyncUser
export const disarmInventorySync = () => inventorySync.setSyncUser(null)

// ── Farm plots (visitor-readable) → maps/{uid}; owner-only writes ─────────────
// guard mirrors mapSync: only debounce-write when viewing one's OWN map, so
// visiting a friend (which loads their plots into the store) never overwrites
// your own map doc.
const farmSync = createFirestoreSync({
  store: useFarmStore,
  logName: 'syncFarm',
  ref: refs.map,
  toDoc: ({ plotsByMap, currentMapKey }) => ({
    farm: currentMapKey ? { [currentMapKey]: plotsByMap[currentMapKey] ?? {} } : {},
    farmUpdatedAt: serverTimestamp(),
  }),
  fromDoc: (data) => {
    if (!data.farm) return {}
    const currentMapKey = useFarmStore.getState().currentMapKey
    const plotsByMap = data.farm
    return { plotsByMap, plots: (currentMapKey && plotsByMap[currentMapKey]) || {} }
  },
  changed: (s, p) => s.plotsByMap !== p.plotsByMap,
  guard: (_s, uid) => useWorldStore.getState().currentMapOwnerUid === uid,
  needsSeed: () => false,
})

export const hydrateFarmFromFirestore = farmSync.hydrate
export const armFarmSync = farmSync.setSyncUser
export const disarmFarmSync = () => farmSync.setSyncUser(null)

// Manual save — called from MapPalette after an explicit decoration change.
export async function syncMapToFirestore(uid, objectsByMap) {
  if (!uid) return
  try {
    await setDoc(refs.map(uid), { objectsByMap, mapUpdatedAt: serverTimestamp() }, { merge: true })
  } catch (e) {
    console.error('[syncMap] push failed:', e)
  }
}

// Visit another user's Personal Map: swap owner, clear stale objects, load theirs.
export async function visitMap(ownerUid) {
  if (!ownerUid) return
  useWorldStore.setState({ currentMapOwnerUid: ownerUid, objectsByMap: {}, mapObjects: [], editMode: false })
  useFarmStore.setState({ plotsByMap: {}, plots: {} })
  await hydrateMapFromFirestore(ownerUid)
  await hydrateFarmFromFirestore(ownerUid)
}

// Return to the signed-in user's own Personal Map.
export async function returnHome(selfUid) {
  if (!selfUid) return
  useWorldStore.setState({ currentMapOwnerUid: selfUid, objectsByMap: {}, mapObjects: [], editMode: false })
  useFarmStore.setState({ plotsByMap: {}, plots: {} })
  await hydrateMapFromFirestore(selfUid)
  await hydrateFarmFromFirestore(selfUid)
}

export const hydrateMapFromFirestore = mapSync.hydrate
