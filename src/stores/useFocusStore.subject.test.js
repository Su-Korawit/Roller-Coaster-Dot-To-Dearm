import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ startFocus: vi.fn(), checkInFocus: vi.fn(), endFocus: vi.fn(), abandonFocus: vi.fn() }))
vi.mock('../services/focus', () => ({
  startFocus: (...a) => m.startFocus(...a),
  checkInFocus: (...a) => m.checkInFocus(...a),
  endFocus: (...a) => m.endFocus(...a),
  abandonFocus: (...a) => m.abandonFocus(...a),
  CHECKIN_PROMPT_MS: 1500000,
}))

const { useFocusStore } = await import('./useFocusStore')
const { useLeavesStore } = await import('./useLeavesStore')

beforeEach(() => {
  vi.clearAllMocks()
  useFocusStore.getState().reset()
  useLeavesStore.getState().reset()
})

describe('focus by subject (TCAS Plan)', () => {
  it('starts a session for a subject and remembers it (also when the server resumed another one)', async () => {
    m.startFocus.mockResolvedValue({ ok: true, mode: 'flexible', plannedMin: 25, startedAt: 1, lastCheckInAt: 1, verifiedMs: 0, subjectKey: 'a_lv_64' })
    await useFocusStore.getState().start({ mode: 'flexible', plannedMin: 25, subjectKey: 'a_lv_64' })
    expect(m.startFocus).toHaveBeenCalledWith({ mode: 'flexible', plannedMin: 25, practice: undefined, subjectKey: 'a_lv_64' })
    expect(useFocusStore.getState().subjectKey).toBe('a_lv_64')
  })

  it('a session without a subject has none', async () => {
    m.startFocus.mockResolvedValue({ ok: true, mode: 'flexible', plannedMin: 25, startedAt: 1, lastCheckInAt: 1, verifiedMs: 0, subjectKey: null })
    await useFocusStore.getState().start({ mode: 'flexible', plannedMin: 25 })
    expect(useFocusStore.getState().subjectKey).toBeNull()
  })

  it('ending applies the server total for that subject without touching the others', async () => {
    useLeavesStore.setState({ focusBySubject: { tgat: 600000 } })
    useFocusStore.setState({ status: 'running', mode: 'flexible', plannedMin: 25, startedAt: 0, subjectKey: 'a_lv_64' })
    m.endFocus.mockResolvedValue({ ok: true, leaves: 27, tree: 'shrub', withered: false, subjectKey: 'a_lv_64', subjectMs: 1500000 })
    await useFocusStore.getState().end()
    expect(useLeavesStore.getState().focusBySubject).toEqual({ tgat: 600000, a_lv_64: 1500000 })
  })

  it('an ended session without a subject total leaves the hours alone', async () => {
    useLeavesStore.setState({ focusBySubject: { tgat: 600000 } })
    useFocusStore.setState({ status: 'running', mode: 'flexible', plannedMin: 25, startedAt: 0 })
    m.endFocus.mockResolvedValue({ ok: true, leaves: 27, tree: 'shrub', withered: false })
    await useFocusStore.getState().end()
    expect(useLeavesStore.getState().focusBySubject).toEqual({ tgat: 600000 })
  })

  it('the Leaves store reads the hours from the user document', async () => {
    const getDoc = vi.fn()
    vi.doMock('firebase/firestore', () => ({ getDoc }))
    useLeavesStore.getState().applyServer({ focusBySubject: { a_lv_65: 5 } })
    expect(useLeavesStore.getState().focusBySubject).toEqual({ a_lv_65: 5 })
    useLeavesStore.getState().reset()
    expect(useLeavesStore.getState().focusBySubject).toEqual({})
  })
})
