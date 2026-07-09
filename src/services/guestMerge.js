// ============================================================================
// guestMerge.js — lift guest (logged-out) tool work into the account at login
// ----------------------------------------------------------------------------
// ADR-0012: feature sites are usable without a session. Guest work already
// survives refresh through the stores' own persist keys (`rc-roadmap-store`,
// `rc-school-store`) — there is no parallel rc-guest-* copy of the data. What
// this module adds is the part persist can't answer: WAS this state produced
// by a guest? A dirty marker (`rc-guest-dirty`) is written only when a store
// mutates while logged out, so a returning user whose persisted state merely
// mirrors their own cloud data never triggers a merge or a conflict dialog.
//
// Lifecycle (wired in sessionBootstrap / useAuthStore):
//   armGuestDirtyTracking()  once at boot (main.jsx) — subscribes to stores
//   enableGuestTracking()    from teardownSession (auth resolved logged-out)
//   disableGuestTracking()   at the top of bootstrapSession (login starting)
//   captureGuestWork()       bootstrapSession, BEFORE hydration overwrites
//   resolveGuestMerge(work)  bootstrapSession, AFTER hydration:
//                              cloud side empty  -> apply silently
//                              cloud side has data -> return conflict payload
//                              (GuestMergeDialog then applies or discards)
// ============================================================================
import { useRoadmapStore } from '../stores/useRoadmapStore'
import { useSchoolStore } from '../stores/useSchoolStore'
import { toSchema } from '../utils/roadmapExport'

const DIRTY_KEY = 'rc-guest-dirty'

let tracking = false
let armed = false

function readDirty() {
  try {
    return JSON.parse(localStorage.getItem(DIRTY_KEY) ?? '{}') || {}
  } catch {
    return {}
  }
}

function markDirty(tool) {
  const dirty = readDirty()
  if (dirty[tool]) return
  try {
    localStorage.setItem(DIRTY_KEY, JSON.stringify({ ...dirty, [tool]: true }))
  } catch {
    /* storage full/unavailable — guest merge degrades to a no-op */
  }
}

export function clearGuestDirty() {
  try {
    localStorage.removeItem(DIRTY_KEY)
  } catch {
    /* ignore */
  }
}

export function enableGuestTracking() {
  tracking = true
}

export function disableGuestTracking() {
  tracking = false
}

/**
 * Subscribe once to the guest-capable stores. Marks the tool dirty only while
 * tracking is enabled — i.e. after auth has resolved to logged-out — so
 * hydration writes during bootstrapSession never count as guest work.
 */
export function armGuestDirtyTracking() {
  if (armed) return
  armed = true
  useRoadmapStore.subscribe((state, prev) => {
    if (!tracking) return
    if (state.nodes !== prev.nodes || state.edges !== prev.edges) markDirty('roadmap')
  })
  useSchoolStore.subscribe((state, prev) => {
    if (!tracking) return
    if (
      state.subjects !== prev.subjects ||
      state.scheduleSlots !== prev.scheduleSlots ||
      state.appointments !== prev.appointments ||
      state.notes !== prev.notes
    ) {
      markDirty('school')
    }
  })
}

export function hasGuestWork() {
  const dirty = readDirty()
  return Boolean(dirty.roadmap || dirty.school)
}

/**
 * Snapshot guest work from the live stores. Must run BEFORE hydration —
 * bootstrapSession's hydrate steps overwrite these stores with cloud state.
 * Returns null when there is nothing to merge.
 */
export function captureGuestWork() {
  const dirty = readDirty()
  const work = {}
  if (dirty.roadmap) {
    const { nodes, edges } = useRoadmapStore.getState()
    if (nodes.length > 0) work.roadmap = toSchema(nodes, edges)
  }
  if (dirty.school) {
    const { subjects, scheduleSlots, appointments, notes } = useSchoolStore.getState()
    if (subjects.length || scheduleSlots.length || appointments.length || notes.length) {
      work.school = { subjects, scheduleSlots, appointments, notes }
    }
  }
  return Object.keys(work).length > 0 ? work : null
}

// Additive apply — importRoadmap regenerates every id (never collides with
// cloud nodes) and shifts the imported set clear of existing content.
function applyGuestRoadmap(schema) {
  useRoadmapStore.getState().importRoadmap(schema)
}

// Additive apply for the School System. Subjects + slots go through
// importTimetable (same-name subjects are skipped whole, so re-merging never
// duplicates); appointments/notes are re-created with their guest subjectId
// remapped by subject name, an id guard against exact re-adds, and note
// upserts deduping by (date, subjectId). updateAppointment (not
// toggleAppointment) restores completion so no streak stack is awarded.
function applyGuestSchool({ subjects = [], scheduleSlots = [], appointments = [], notes = [] }) {
  const store = () => useSchoolStore.getState()

  store().importTimetable(
    subjects.map((sub) => ({
      name: sub.name,
      color: sub.color,
      slots: scheduleSlots
        .filter((sl) => sl.subjectId === sub.id)
        .map(({ day, startTime, endTime }) => ({ day, startTime, endTime })),
    })),
  )

  const byName = new Map(store().subjects.map((s) => [s.name.trim().toLowerCase(), s.id]))
  const remapSubjectId = (guestSubjectId) => {
    if (guestSubjectId == null) return null
    const guest = subjects.find((s) => s.id === guestSubjectId)
    return guest ? (byName.get(guest.name.trim().toLowerCase()) ?? null) : null
  }

  const existingApptIds = new Set(store().appointments.map((a) => a.id))
  appointments.forEach((a) => {
    if (existingApptIds.has(a.id)) return
    const id = store().addAppointment(remapSubjectId(a.subjectId), {
      title: a.title,
      kind: a.kind,
      dueDate: a.dueDate,
    })
    if (a.completed) {
      store().updateAppointment(id, { completed: true, completedAt: a.completedAt ?? Date.now() })
    }
  })

  notes.forEach((n) => {
    store().upsertNote({ date: n.date, subjectId: remapSubjectId(n.subjectId), text: n.text })
  })
}

/** Apply a captured payload (both tools). Used for silent merges and by the
 * conflict dialog's "เก็บงานใหม่เพิ่มเข้าไป" action. */
export function applyGuestWork(work) {
  if (work?.roadmap) applyGuestRoadmap(work.roadmap)
  if (work?.school) applyGuestSchool(work.school)
}

/**
 * Post-hydration decision (ADR-0012 merge policy). Per tool: cloud side empty
 * -> apply silently; cloud side has data -> hand back as a conflict for the
 * dialog. Returns null when fully resolved (marker cleared), else the payload
 * of the still-conflicting tools (marker kept until the user decides).
 */
export function resolveGuestMerge(work) {
  if (!work) {
    clearGuestDirty()
    return null
  }

  const conflict = {}

  if (work.roadmap) {
    const cloudHasNodes = useRoadmapStore
      .getState()
      .sheets.some((sh) => (sh.nodes ?? []).length > 0)
    if (cloudHasNodes) conflict.roadmap = work.roadmap
    else applyGuestRoadmap(work.roadmap)
  }

  if (work.school) {
    const s = useSchoolStore.getState()
    const cloudHasSchool =
      s.subjects.length > 0 || s.scheduleSlots.length > 0 || s.appointments.length > 0 || s.notes.length > 0
    if (cloudHasSchool) conflict.school = work.school
    else applyGuestSchool(work.school)
  }

  if (Object.keys(conflict).length === 0) {
    clearGuestDirty()
    return null
  }
  return conflict
}
