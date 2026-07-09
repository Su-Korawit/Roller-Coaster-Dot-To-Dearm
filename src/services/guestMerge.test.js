// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const incrementStacks = vi.fn()
vi.mock('../stores/useUserStore', () => ({
  useUserStore: { getState: () => ({ incrementStacks }) },
}))

const { useRoadmapStore } = await import('../stores/useRoadmapStore')
const { useSchoolStore } = await import('../stores/useSchoolStore')
const { useGuestMergeStore } = await import('../stores/useGuestMergeStore')
const {
  armGuestDirtyTracking,
  enableGuestTracking,
  disableGuestTracking,
  captureGuestWork,
  resolveGuestMerge,
  hasGuestWork,
  clearGuestDirty,
} = await import('./guestMerge')

const DIRTY_KEY = 'rc-guest-dirty'

function resetRoadmap(sheets = [], activeSheetId = null) {
  const list = sheets.length
    ? sheets
    : [{ id: 'local-default', name: 'Roadmap', nodes: [], edges: [], timeline: null, ownerUid: null, myRole: 'owner' }]
  const active = list.find((sh) => sh.id === (activeSheetId ?? list[0].id)) ?? list[0]
  useRoadmapStore.setState({
    sheets: list,
    activeSheetId: active.id,
    nodes: active.nodes,
    edges: active.edges,
  })
}

describe('guestMerge', () => {
  beforeEach(() => {
    localStorage.clear()
    disableGuestTracking()
    resetRoadmap()
    useSchoolStore.getState().clearSchool()
    useGuestMergeStore.setState({ pendingConflict: false, pendingWork: null })
    incrementStacks.mockClear()
    armGuestDirtyTracking()
  })

  it('captures nothing when the dirty marker is absent, even with store data', () => {
    useRoadmapStore.getState().addNode('process')
    useSchoolStore.getState().addSubject({ name: 'Math' })
    expect(hasGuestWork()).toBe(false)
    expect(captureGuestWork()).toBeNull()
  })

  it('marks a tool dirty only while tracking is enabled', () => {
    useRoadmapStore.getState().addNode('process')
    expect(hasGuestWork()).toBe(false)

    enableGuestTracking()
    useRoadmapStore.getState().addNode('process')
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY))).toEqual({ roadmap: true })

    disableGuestTracking()
    useSchoolStore.getState().addSubject({ name: 'Math' })
    expect(JSON.parse(localStorage.getItem(DIRTY_KEY))).toEqual({ roadmap: true })
  })

  it('merges silently into an empty cloud and clears the marker', () => {
    enableGuestTracking()
    useRoadmapStore.getState().addNode('process')
    useSchoolStore.getState().addSubject({ name: 'Math' })
    disableGuestTracking()

    const work = captureGuestWork()
    expect(work.roadmap.nodes).toHaveLength(1)
    expect(work.school.subjects).toHaveLength(1)

    // Simulate hydration overwriting the stores with an empty cloud account.
    resetRoadmap([{ id: 'cloud-1', name: 'Roadmap', nodes: [], edges: [], timeline: null, ownerUid: 'u1', myRole: 'owner' }])
    useSchoolStore.getState().clearSchool()

    expect(resolveGuestMerge(work)).toBeNull()
    expect(useRoadmapStore.getState().nodes).toHaveLength(1)
    expect(useSchoolStore.getState().subjects.map((s) => s.name)).toEqual(['Math'])
    expect(hasGuestWork()).toBe(false)
  })

  it('returns a conflict per tool whose cloud side has data, without touching stores', () => {
    enableGuestTracking()
    useRoadmapStore.getState().addNode('process')
    disableGuestTracking()
    const work = captureGuestWork()

    const cloudNode = { id: 'n-cloud', type: 'process', position: { x: 0, y: 0 }, data: {} }
    resetRoadmap([{ id: 'cloud-1', name: 'Roadmap', nodes: [cloudNode], edges: [], timeline: null, ownerUid: 'u1', myRole: 'owner' }])

    const conflict = resolveGuestMerge(work)
    expect(conflict.roadmap.nodes).toHaveLength(1)
    expect(useRoadmapStore.getState().nodes).toEqual([cloudNode])
    expect(hasGuestWork()).toBe(true) // marker survives until the user decides
  })

  it('mergeGuestAppend applies the pending work additively with regenerated ids', () => {
    enableGuestTracking()
    useRoadmapStore.getState().addNode('process')
    disableGuestTracking()
    const work = captureGuestWork()
    const guestId = work.roadmap.nodes[0].id

    const cloudNode = { id: 'n-cloud', type: 'process', position: { x: 0, y: 0 }, data: {} }
    resetRoadmap([{ id: 'cloud-1', name: 'Roadmap', nodes: [cloudNode], edges: [], timeline: null, ownerUid: 'u1', myRole: 'owner' }])

    useGuestMergeStore.getState().offerGuestMerge(resolveGuestMerge(work))
    expect(useGuestMergeStore.getState().pendingConflict).toBe(true)

    useGuestMergeStore.getState().mergeGuestAppend()
    const nodes = useRoadmapStore.getState().nodes
    expect(nodes).toHaveLength(2)
    expect(nodes.map((n) => n.id)).not.toContain(guestId) // remapped, no collision
    expect(useGuestMergeStore.getState().pendingConflict).toBe(false)
    expect(hasGuestWork()).toBe(false)
  })

  it('discardGuest keeps the cloud state and clears marker + offer', () => {
    localStorage.setItem(DIRTY_KEY, JSON.stringify({ school: true }))
    useGuestMergeStore.getState().offerGuestMerge({ school: { subjects: [], scheduleSlots: [], appointments: [], notes: [] } })

    useGuestMergeStore.getState().discardGuest()
    expect(useGuestMergeStore.getState().pendingConflict).toBe(false)
    expect(hasGuestWork()).toBe(false)
    expect(useSchoolStore.getState().subjects).toEqual([])
  })

  it('school merge skips same-name subjects, remaps appointment/note subjectIds, and never awards stacks', () => {
    enableGuestTracking()
    const guestMathId = useSchoolStore.getState().addSubject({ name: 'Math', color: '#111111' })
    useSchoolStore.getState().addScheduleSlot(guestMathId, { day: 'mon', startTime: '09:00', endTime: '10:00' })
    const apptId = useSchoolStore.getState().addAppointment(guestMathId, { title: 'HW 1', dueDate: '2026-07-15' })
    useSchoolStore.getState().updateAppointment(apptId, { completed: true, completedAt: 123 })
    useSchoolStore.getState().upsertNote({ date: '2026-07-09', subjectId: guestMathId, text: 'guest note' })
    disableGuestTracking()

    const work = captureGuestWork()

    // Cloud already has a Math subject -> conflict -> user chooses append.
    useSchoolStore.getState().clearSchool()
    const cloudMathId = useSchoolStore.getState().addSubject({ name: 'math' })
    incrementStacks.mockClear()

    const conflict = resolveGuestMerge(work)
    useGuestMergeStore.getState().offerGuestMerge(conflict)
    useGuestMergeStore.getState().mergeGuestAppend()

    const state = useSchoolStore.getState()
    expect(state.subjects).toHaveLength(1) // same-name skip (case-insensitive)
    expect(state.scheduleSlots).toEqual([]) // slots of a skipped subject are dropped
    expect(state.appointments).toHaveLength(1)
    expect(state.appointments[0]).toMatchObject({ subjectId: cloudMathId, title: 'HW 1', completed: true })
    expect(state.notes).toHaveLength(1)
    expect(state.notes[0]).toMatchObject({ subjectId: cloudMathId, text: 'guest note' })
    expect(incrementStacks).not.toHaveBeenCalled()
  })
})
