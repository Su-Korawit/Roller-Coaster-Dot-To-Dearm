import { describe, it, expect, beforeEach, vi } from 'vitest'

const entitlementsMock = vi.hoisted(() => ({ extra: 0 }))
vi.mock('./useEntitlementsStore', () => ({
  useEntitlementsStore: { getState: () => ({ extraPlanSlots: () => entitlementsMock.extra }) },
}))

const { usePlansStore } = await import('./usePlansStore')

const bio = { key: 'a_lv_66', label: 'A-Level ชีววิทยา', weight: 70 }
const tpat1 = { key: 'tpat1', label: 'TPAT1 วิชาเฉพาะกสพท', weight: 30 }
const prog = (n, over = {}) => ({
  universityId: `u${n}`, universityName: `มหาวิทยาลัย ${n}`, programId: `p${n}`, programName: `หลักสูตร ${n}`,
  buildingId: 'med', round: 3, projectName: null, minGpax: 2.5, scores: [tpat1, bio], ...over,
})
const ranks = () => usePlansStore.getState().plans.map((p) => [p.programId, p.round, p.rank])

describe('usePlansStore.addFromProgram', () => {
  beforeEach(() => {
    entitlementsMock.extra = 0
    usePlansStore.getState().resetPlans()
  })

  it('adds a program to a round with the next free rank and an auto checklist', () => {
    const r = usePlansStore.getState().addFromProgram(prog(1))
    expect(r).toMatchObject({ ok: true, rank: 1 })
    const e = usePlansStore.getState().plans[0]
    expect(e).toMatchObject({ v: 2, universityId: 'u1', programId: 'p1', round: 3, rank: 1, university: 'u1', program: 'p1', programName: 'หลักสูตร 1' })
    expect(e.checklist.map((c) => c.text)).toEqual(['GPAX ≥ 2.5', 'สอบ TPAT1 วิชาเฉพาะกสพท', 'สอบ A-Level ชีววิทยา'])
    expect(usePlansStore.getState().activePlanId).toBe(r.id)
  })

  it('ranks follow insertion in round 3 and other rounds have no rank', () => {
    usePlansStore.getState().addFromProgram(prog(1))
    usePlansStore.getState().addFromProgram(prog(2, { round: 1 }))
    usePlansStore.getState().addFromProgram(prog(3))
    expect(ranks()).toEqual([['p1', 3, 1], ['p2', 1, null], ['p3', 3, 2]])
  })

  it('refuses the same program in the same round, but allows it in another round', () => {
    usePlansStore.getState().addFromProgram(prog(1))
    expect(usePlansStore.getState().addFromProgram(prog(1))).toEqual({ ok: false, reason: 'duplicate' })
    expect(usePlansStore.getState().addFromProgram(prog(1, { round: 1 }))).toMatchObject({ ok: true })
  })

  it('enforces the slot cap (3 free, entitlements raise it) and reports why', () => {
    for (let i = 1; i <= 3; i++) expect(usePlansStore.getState().addFromProgram(prog(i)).ok).toBe(true)
    expect(usePlansStore.getState().addFromProgram(prog(4))).toEqual({ ok: false, reason: 'cap' })
    entitlementsMock.extra = 1
    expect(usePlansStore.getState().addFromProgram(prog(4)).ok).toBe(true)
  })

  it('can plan a program before choosing a round (round null), once', () => {
    const r = usePlansStore.getState().addFromProgram(prog(1, { round: null }))
    expect(r).toMatchObject({ ok: true, rank: null })
    expect(usePlansStore.getState().plans[0]).toMatchObject({ programId: 'p1', round: null, rank: null })
    expect(usePlansStore.getState().addFromProgram(prog(1, { round: null }))).toEqual({ ok: false, reason: 'duplicate' })
  })

  it('refuses a bad round and a missing program', () => {
    expect(usePlansStore.getState().addFromProgram(prog(1, { round: 7 }))).toEqual({ ok: false, reason: 'bad_round' })
    expect(usePlansStore.getState().addFromProgram(prog(1, { programId: '' }))).toEqual({ ok: false, reason: 'bad_program' })
    expect(usePlansStore.getState().plans).toHaveLength(0)
  })

  it('refuses an 11th round-3 entry even with many slots', () => {
    entitlementsMock.extra = 20
    for (let i = 1; i <= 10; i++) expect(usePlansStore.getState().addFromProgram(prog(i)).ok).toBe(true)
    expect(usePlansStore.getState().addFromProgram(prog(11))).toEqual({ ok: false, reason: 'rank_full' })
  })
})

describe('usePlansStore ranks and rounds', () => {
  beforeEach(() => {
    entitlementsMock.extra = 20
    usePlansStore.getState().resetPlans()
    for (let i = 1; i <= 4; i++) usePlansStore.getState().addFromProgram(prog(i))
  })

  it('removing an entry closes the gap in round 3', () => {
    usePlansStore.getState().removePlan(usePlansStore.getState().plans[1].id)
    expect(ranks()).toEqual([['p1', 3, 1], ['p3', 3, 2], ['p4', 3, 3]])
  })

  it('reorderRound3 moves an entry and renumbers 1..n with no duplicates', () => {
    usePlansStore.getState().reorderRound3(3, 0)
    expect([...ranks()].sort((a, b) => a[2] - b[2])).toEqual([['p4', 3, 1], ['p1', 3, 2], ['p2', 3, 3], ['p3', 3, 4]])
    expect(new Set(ranks().map((r) => r[2])).size).toBe(4)
  })

  it('reorderRound3 ignores out-of-range indices', () => {
    const before = ranks()
    usePlansStore.getState().reorderRound3(-1, 2)
    usePlansStore.getState().reorderRound3(0, 9)
    expect(ranks()).toEqual(before)
  })

  it('moving an entry out of round 3 clears its rank and closes the gap; moving in takes the next free rank', () => {
    const id = usePlansStore.getState().plans[0].id
    usePlansStore.getState().setRound(id, 1)
    expect(ranks()).toEqual([['p1', 1, null], ['p2', 3, 1], ['p3', 3, 2], ['p4', 3, 3]])
    usePlansStore.getState().setRound(id, 3)
    expect(ranks()[0]).toEqual(['p1', 3, 4])
  })

  it('setRound regenerates the checklist but keeps ticked and own items', () => {
    const id = usePlansStore.getState().plans[0].id
    usePlansStore.getState().toggleChecklist(id, 'auto:gpax')
    usePlansStore.getState().addChecklistItem(id, 'ซื้อชีท')
    usePlansStore.getState().setRound(id, 1)
    const list = usePlansStore.getState().plans[0].checklist
    expect(list.find((c) => c.id === 'auto:gpax').done).toBe(true)
    expect(list.find((c) => c.id === 'auto:portfolio')).toBeTruthy()
    expect(list.some((c) => c.text === 'ซื้อชีท')).toBe(true)
  })

  it('setRound refuses a full round 3 and a bad round', () => {
    for (let i = 5; i <= 10; i++) usePlansStore.getState().addFromProgram(prog(i))
    const extra = usePlansStore.getState().addFromProgram(prog(11, { round: 2 }))
    expect(usePlansStore.getState().setRound(extra.id, 3)).toEqual({ ok: false, reason: 'rank_full' })
    expect(usePlansStore.getState().setRound(extra.id, 9)).toEqual({ ok: false, reason: 'bad_round' })
  })
})

describe('usePlansStore checklist and goals', () => {
  beforeEach(() => {
    entitlementsMock.extra = 0
    usePlansStore.getState().resetPlans()
  })

  it('toggles, adds (trimmed, non-empty, short) and removes only the student’s own items', () => {
    const { id } = usePlansStore.getState().addFromProgram(prog(1))
    const item = (itemId) => usePlansStore.getState().plans[0].checklist.find((c) => c.id === itemId)
    usePlansStore.getState().toggleChecklist(id, 'auto:tpat1')
    expect(item('auto:tpat1').done).toBe(true)
    usePlansStore.getState().toggleChecklist(id, 'auto:tpat1')
    expect(item('auto:tpat1').done).toBe(false)

    expect(usePlansStore.getState().addChecklistItem(id, '   ')).toBeNull()
    expect(usePlansStore.getState().addChecklistItem(id, 'x'.repeat(200))).toBeNull()
    const itemId = usePlansStore.getState().addChecklistItem(id, '  ขอเอกสาร  ')
    expect(item(itemId)).toMatchObject({ text: 'ขอเอกสาร', source: 'user', done: false })
    usePlansStore.getState().removeChecklistItem(id, 'auto:gpax')
    expect(item('auto:gpax')).toBeTruthy()
    usePlansStore.getState().removeChecklistItem(id, itemId)
    expect(item(itemId)).toBeUndefined()
  })

  it('actions on an unknown id do nothing', () => {
    usePlansStore.getState().addFromProgram(prog(1))
    const before = usePlansStore.getState().plans
    usePlansStore.getState().toggleChecklist('nope', 'x')
    usePlansStore.getState().setRound('nope', 1)
    expect(usePlansStore.getState().plans).toBe(before)
  })

  it('goal hours accept only valid subject keys and sane hours', () => {
    const s = usePlansStore.getState()
    s.setGoalHours('a_lv_66', 55)
    s.setGoalHours('gpax', 10)
    s.setGoalHours('__proto__', 10)
    s.setGoalHours('a_lv_65', -3)
    s.setGoalHours('a_lv_64', 9999)
    expect(usePlansStore.getState().goalHours).toEqual({ a_lv_66: 55 })
  })
})

describe('usePlansStore.hydrate (old data)', () => {
  beforeEach(() => usePlansStore.getState().resetPlans())

  it('upgrades old entries and the synthetic legacy entry, keeping them usable', () => {
    usePlansStore.getState().hydrate({ plans: [{ id: 'legacy', university: 'CU', program: 'CS' }, { id: 'plan-1', university: 'u', program: 'p', addedAt: 3 }], activePlanId: 'legacy' })
    const s = usePlansStore.getState()
    expect(s.plans).toHaveLength(2)
    expect(s.plans[0]).toMatchObject({ id: 'legacy', v: 2, university: 'CU', program: 'CS', round: null, rank: null, checklist: [] })
    expect(s.activePlanId).toBe('legacy')
  })

  it('drops junk entries and repairs duplicate ranks from the cloud', () => {
    usePlansStore.getState().hydrate({
      plans: [null, { id: 'a', round: 3, rank: 2, programId: 'p1' }, { id: 'b', round: 3, rank: 2, programId: 'p2' }, 'x'],
      activePlanId: 'zzz',
    })
    const s = usePlansStore.getState()
    expect(s.plans.map((p) => [p.id, p.rank])).toEqual([['a', 1], ['b', 2]])
    expect(s.activePlanId).toBe('a')
  })

  it('keeps stored goal hours and ignores bad ones', () => {
    usePlansStore.getState().hydrate({ plans: [], goalHours: { a_lv_66: 40, nope: 5, a_lv_65: 'x' } })
    expect(usePlansStore.getState().goalHours).toEqual({ a_lv_66: 40 })
  })
})
