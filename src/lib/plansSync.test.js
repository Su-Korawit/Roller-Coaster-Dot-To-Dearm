import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const setDoc = vi.fn()
const getDoc = vi.fn()
vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  setDoc: (...a) => setDoc(...a),
  getDoc: (...a) => getDoc(...a),
  collection: vi.fn((_, ...p) => ({ _col: p.join('/') })),
  doc: vi.fn((_, ...p) => ({ _path: p.join('/') })),
  query: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
}))
vi.mock('../stores/useEntitlementsStore', () => ({
  useEntitlementsStore: { getState: () => ({ extraPlanSlots: () => 10 }) },
}))
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })

const { usePlansStore } = await import('../stores/usePlansStore')
const { setPlansSyncUser, hydratePlansFromFirestore } = await import('./syncManager')

const prog = (n, over = {}) => ({
  universityId: `u${n}`, universityName: `มหาวิทยาลัย ${n}`, programId: `p${n}`, programName: `หลักสูตร ${n}`,
  buildingId: 'med', round: 3, minGpax: 2.5, scores: [{ key: 'tpat1', label: 'TPAT1', weight: 30 }], ...over,
})
const lastWrite = () => setDoc.mock.calls.at(-1)

describe('plan edits are saved to the profile', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setDoc.mockReset(); getDoc.mockReset()
    setDoc.mockResolvedValue(undefined)
    usePlansStore.getState().resetPlans()
  })
  afterEach(() => {
    setPlansSyncUser(null)
    vi.useRealTimers()
  })

  it('writes the plan, its rank, checklist and the legacy mirror after a short debounce', async () => {
    setPlansSyncUser('u1')
    usePlansStore.getState().addFromProgram(prog(1))
    usePlansStore.getState().addFromProgram(prog(2))
    await vi.advanceTimersByTimeAsync(1200)
    expect(setDoc).toHaveBeenCalledTimes(1)
    const [ref, data, opts] = lastWrite()
    expect(ref).toEqual({ _path: 'users/u1' })
    expect(opts).toEqual({ merge: true })
    expect(data.profile.plans.map((p) => [p.programId, p.round, p.rank])).toEqual([['p1', 3, 1], ['p2', 3, 2]])
    expect(data.profile.plans[0].checklist.length).toBeGreaterThan(0)
    expect(data.profile.program).toBe('p1')
    expect(data.profile.updatedAt).toEqual({ _type: 'serverTimestamp' })
  })

  it.each([
    ['ticking a checklist item', (id) => usePlansStore.getState().toggleChecklist(id, 'auto:gpax')],
    ['ranking round 3', () => usePlansStore.getState().reorderRound3(0, 1)],
    ['moving a round', (id) => usePlansStore.getState().setRound(id, 1)],
    ['an own to-do', (id) => usePlansStore.getState().addChecklistItem(id, 'ขอเอกสาร')],
  ])('%s is saved', async (_n, act) => {
    const { id } = usePlansStore.getState().addFromProgram(prog(1))
    usePlansStore.getState().addFromProgram(prog(2))
    setPlansSyncUser('u1')
    act(id)
    await vi.advanceTimersByTimeAsync(1200)
    expect(setDoc).toHaveBeenCalledTimes(1)
  })

  it('goal hours are saved with the profile', async () => {
    setPlansSyncUser('u1')
    usePlansStore.getState().setGoalHours('a_lv_66', 55)
    await vi.advanceTimersByTimeAsync(1200)
    expect(lastWrite()[1].profile.goalHours).toEqual({ a_lv_66: 55 })
  })

  it('removing the last program writes an empty list so it does not come back after the next load', async () => {
    const { id } = usePlansStore.getState().addFromProgram(prog(1))
    setPlansSyncUser('u1')
    usePlansStore.getState().removePlan(id)
    await vi.advanceTimersByTimeAsync(1200)
    expect(lastWrite()[1].profile.plans).toEqual([])
  })

  it('writes nothing for a guest (no user armed) and nothing after sign-out', async () => {
    usePlansStore.getState().addFromProgram(prog(1))
    await vi.advanceTimersByTimeAsync(1200)
    expect(setDoc).not.toHaveBeenCalled()
    setPlansSyncUser('u1')
    setPlansSyncUser(null)
    usePlansStore.getState().addFromProgram(prog(2))
    await vi.advanceTimersByTimeAsync(1200)
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('hydrating from the cloud upgrades old entries without writing them straight back', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ profile: { plans: [{ id: 'a', university: 'u', program: 'p', addedAt: 1 }], activePlanId: 'a' } }) })
    setPlansSyncUser('u1')
    await hydratePlansFromFirestore('u1')
    expect(usePlansStore.getState().plans[0]).toMatchObject({ id: 'a', v: 2, round: null })
    await vi.advanceTimersByTimeAsync(1200)
    expect(setDoc).not.toHaveBeenCalled()
  })
})
