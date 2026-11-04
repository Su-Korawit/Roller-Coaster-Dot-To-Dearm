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
import { refs, shapes } from './db'
import { useTaskStore } from '../stores/useTaskStore'
import { useRoadmapStore } from '../stores/useRoadmapStore'
import { useUserStore } from '../stores/useUserStore'
import { useWorldStore } from '../stores/useWorldStore'
import { useSchoolStore } from '../stores/useSchoolStore'
import { useHotbarStore } from '../stores/useHotbarStore'
import { useResumeStore } from '../stores/useResumeStore'
import { useGuideStore } from '../stores/useGuideStore'
import { mergeResume } from './resumeRules'

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
 * @param {number}   [opts.delayMs]  debounce window in ms (default 1000)
 * @param {(status: 'saving'|'saved'|'error') => void} [opts.onStatus]  save-status callback, defaults to a no-op — only the roadmap instance passes one today
 * @returns {{ push(uid): Promise<void>, hydrate(uid): Promise<void>, setSyncUser(uid): void }}
 */
export function createFirestoreSync({ store, logName, toDoc, fromDoc, changed, needsSeed, ref, guard, onStatus, delayMs = 1000 }) {
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
      }, delayMs)
    })
  }

  // True while a local mutation is debounced and not yet sent — the store is
  // ahead of whatever Firestore currently holds. Callers with a real-time
  // listener on the same doc (e.g. the IR Board) must skip an incoming
  // snapshot while this is true: it can only reflect a state older than the
  // edit still sitting in this debounce window.
  function isPending() {
    return timer != null
  }

  return { push, hydrate, setSyncUser, isPending, flush: flushPending }
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
    return { nodes, edges, timeline: sheet?.timeline ?? state.timeline ?? null, updatedAt: serverTimestamp() }
  },
  fromDoc: (data) => {
    if (!('nodes' in data || 'edges' in data || 'timeline' in data)) return {}
    const updates = {
      nodes: data.nodes ?? [],
      edges: data.edges ?? [],
    }
    if ('timeline' in data) updates.timeline = data.timeline
    return updates
  },
  changed: (s, p) => s.nodes !== p.nodes || s.edges !== p.edges || s.timeline !== p.timeline,
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
  toDoc: ({ portfolioData, journeys, streak, lastStreakDate, bestStreak }) => ({
    portfolioData,
    journeys,
    streak,
    lastStreakDate,
    bestStreak,
    portfolioUpdatedAt: serverTimestamp(),
  }),
  fromDoc: (data) => {
    const updates = {}
    if (data.portfolioData) updates.portfolioData = data.portfolioData
    if (data.journeys) updates.journeys = data.journeys
    if (data.photoURL) updates.profilePhotoURL = data.photoURL
    if (typeof data.streak === 'number') updates.streak = data.streak
    if (typeof data.lastStreakDate === 'string') updates.lastStreakDate = data.lastStreakDate
    if (typeof data.bestStreak === 'number') updates.bestStreak = data.bestStreak
    return updates
  },
  changed: (s, p) =>
    s.portfolioData !== p.portfolioData || s.journeys !== p.journeys
    || s.streak !== p.streak || s.lastStreakDate !== p.lastStreakDate || s.bestStreak !== p.bestStreak,
  needsSeed: (data) => !data.portfolioData || !data.journeys,
})

// Re-export the original named API so existing import sites stay unchanged.
export const syncTasksToFirestore = tasksSync.push
export const hydrateTasksFromFirestore = tasksSync.hydrate
export const setTaskSyncUser = tasksSync.setSyncUser

export const pushRoadmapSheetToFirestore = roadmapSheetSync.push
export async function hydrateRoadmapSheetFromFirestore(sheetId) {
  await roadmapSheetSync.hydrate(sheetId)
  useRoadmapStore.setState((state) => ({
    sheets: state.sheets.map((sh) =>
      sh.id === state.activeSheetId
        ? { ...sh, nodes: state.nodes, edges: state.edges, timeline: state.timeline ?? sh.timeline ?? null }
        : sh,
    ),
  }))
}
export const armRoadmapSheetSync = (sheetId) => roadmapSheetSync.setSyncUser(sheetId)
export const disarmRoadmapSheetSync = () => roadmapSheetSync.setSyncUser(null)
export const hasPendingRoadmapSheetSync = () => roadmapSheetSync.isPending()

export const syncPortfolioToFirestore = portfolioSync.push
export const hydratePortfolioFromFirestore = portfolioSync.hydrate
export const setPortfolioSyncUser = portfolioSync.setSyncUser

// ── School System (subjects, schedule slots, appointments, notes) → users/{uid}
const schoolSync = createFirestoreSync({
  store: useSchoolStore,
  logName: 'syncSchool',
  toDoc: ({ subjects, scheduleSlots, appointments, notes }) => ({
    school: { subjects, scheduleSlots, appointments, notes },
    schoolUpdatedAt: serverTimestamp(),
  }),
  fromDoc: (data) => {
    if (!data.school) return {}
    return {
      subjects: data.school.subjects ?? [],
      scheduleSlots: data.school.scheduleSlots ?? [],
      appointments: data.school.appointments ?? [],
      notes: data.school.notes ?? [],
    }
  },
  changed: (s, p) =>
    s.subjects !== p.subjects || s.scheduleSlots !== p.scheduleSlots
    || s.appointments !== p.appointments || s.notes !== p.notes,
  needsSeed: () => false,
})

export const hydrateSchoolFromFirestore = schoolSync.hydrate
export const setSchoolSyncUser = schoolSync.setSyncUser
export const disarmSchoolSync = () => schoolSync.setSyncUser(null)

// ── Hotbar slot order → users/{uid}.hotbar (accounts; guests use localStorage only) ──
const hotbarSync = createFirestoreSync({
  store: useHotbarStore,
  logName: 'syncHotbar',
  toDoc: ({ slots }) => ({ hotbar: slots }),
  fromDoc: (data) => (Array.isArray(data.hotbar) ? { slots: shapes.hotbar(data) } : {}),
  changed: (s, p) => s.slots !== p.slots,
  needsSeed: (data) => !Array.isArray(data.hotbar),
})

export const hydrateHotbarFromFirestore = hotbarSync.hydrate
export const setHotbarSyncUser = hotbarSync.setSyncUser

// ── Guide progress → users/{uid}.guide (accounts; guests use localStorage only) ──
const guideSync = createFirestoreSync({
  store: useGuideStore,
  logName: 'syncGuide',
  toDoc: ({ started, step, done, skipped }) => ({ guide: { started, step, done, skipped } }),
  fromDoc: (data) => (data.guide ? shapes.guide(data) : {}),
  changed: (s, p) => s.started !== p.started || s.step !== p.step || s.done !== p.done || s.skipped !== p.skipped,
  needsSeed: (data) => !data.guide && useGuideStore.getState().started,
})

export const hydrateGuideFromFirestore = guideSync.hydrate
export const setGuideSyncUser = guideSync.setSyncUser

// ── Resume points → users/{uid}.resume (debounced 10 s; flushed when the page is hidden) ──
const resumeSync = createFirestoreSync({
  store: useResumeStore,
  logName: 'syncResume',
  delayMs: 10000,
  toDoc: ({ last, points }) => ({ resume: { last, points } }),
  fromDoc: (data) => {
    if (!data.resume) return {}
    const s = useResumeStore.getState()
    return mergeResume({ last: s.last, points: s.points }, data.resume)
  },
  changed: (s, p) => s.points !== p.points || s.last !== p.last,
  needsSeed: (data) => !data.resume && useResumeStore.getState().last != null,
})

export const hydrateResumeFromFirestore = resumeSync.hydrate
export const setResumeSyncUser = resumeSync.setSyncUser
export const flushResumeSync = resumeSync.flush

// Back to the signed-in user's own world. `mapKey` (optional) switches the map key in the same
// state update, so presence never briefly joins the user's own world under the previous map's key.
export function returnHome(selfUid, mapKey) {
  if (!selfUid) return Promise.resolve()
  useWorldStore.setState({
    currentMapOwnerUid: selfUid,
    ...(mapKey ? { currentMapKey: mapKey } : {}),
  })
  return Promise.resolve()
}
