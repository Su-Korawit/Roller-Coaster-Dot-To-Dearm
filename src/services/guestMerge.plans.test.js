// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const ent = vi.hoisted(() => ({ extra: 0 }))
vi.mock('../stores/useEntitlementsStore', () => ({
  useEntitlementsStore: { getState: () => ({ extraPlanSlots: () => ent.extra }) },
}))
vi.mock('../stores/useUserStore', () => ({ useUserStore: { getState: () => ({ incrementStacks: vi.fn() }) } }))

const { usePlansStore } = await import('../stores/usePlansStore')
const {
  armGuestDirtyTracking, enableGuestTracking, disableGuestTracking,
  captureGuestWork, resolveGuestMerge, hasGuestWork, applyGuestWork,
} = await import('./guestMerge')

const prog = (n, over = {}) => ({
  universityId: `u${n}`, universityName: `มหาวิทยาลัย ${n}`, programId: `p${n}`, programName: `หลักสูตร ${n}`,
  buildingId: 'med', round: 3, minGpax: 2.5, scores: [{ key: 'tpat1', label: 'TPAT1', weight: 30 }], ...over,
})

describe('guest plan entries', () => {
  beforeEach(() => {
    localStorage.clear()
    ent.extra = 0
    disableGuestTracking()
    usePlansStore.getState().resetPlans()
    armGuestDirtyTracking()
  })

  it('marks plans dirty only while a guest edits them', () => {
    usePlansStore.getState().addFromProgram(prog(1))
    expect(hasGuestWork()).toBe(false)
    enableGuestTracking()
    usePlansStore.getState().addFromProgram(prog(2))
    expect(hasGuestWork()).toBe(true)
  })

  it('captures only entries that came from a program, copied out of the live store', () => {
    enableGuestTracking()
    usePlansStore.getState().addPlan() // an empty onboarding slot is not worth merging
    usePlansStore.getState().addFromProgram(prog(1))
    const work = captureGuestWork()
    expect(work.plans.map((p) => p.programId)).toEqual(['p1'])
  })

  it('merges silently into an account with no program entries and keeps ticks and own items', () => {
    enableGuestTracking()
    const { id } = usePlansStore.getState().addFromProgram(prog(1))
    usePlansStore.getState().toggleChecklist(id, 'auto:tpat1')
    usePlansStore.getState().addChecklistItem(id, 'ขอเอกสาร')
    const work = captureGuestWork()
    usePlansStore.getState().hydrate({ plans: [], activePlanId: null }) // login hydrates an empty cloud
    expect(resolveGuestMerge(work)).toBeNull()
    const e = usePlansStore.getState().plans[0]
    expect(e).toMatchObject({ programId: 'p1', round: 3, rank: 1 })
    expect(e.checklist.find((c) => c.id === 'auto:tpat1').done).toBe(true)
    expect(e.checklist.some((c) => c.text === 'ขอเอกสาร')).toBe(true)
    expect(hasGuestWork()).toBe(false)
  })

  it('hands back a conflict when the account already has program entries', () => {
    enableGuestTracking()
    usePlansStore.getState().addFromProgram(prog(1))
    const work = captureGuestWork()
    usePlansStore.getState().hydrate({ plans: [{ id: 'cloud', v: 2, programId: 'p9', round: 3, rank: 1 }] })
    const conflict = resolveGuestMerge(work)
    expect(conflict.plans).toHaveLength(1)
    expect(usePlansStore.getState().plans.map((p) => p.id)).toEqual(['cloud'])
  })

  it('appending skips duplicates, respects the slot cap and never duplicates on a re-merge', () => {
    usePlansStore.getState().hydrate({ plans: [{ id: 'c1', v: 2, programId: 'p1', round: 3, rank: 1 }, { id: 'c2', v: 2, programId: 'p5', round: 1 }] })
    const guest = [1, 2, 3].map((n) => ({ ...prog(n), id: `g${n}`, v: 2, round: 3, checklist: [] }))
    applyGuestWork({ plans: guest })
    const ids = usePlansStore.getState().plans.map((p) => p.programId)
    expect(ids).toEqual(['p1', 'p5', 'p2']) // p1 was already there; p3 hit the 3-slot cap
    applyGuestWork({ plans: guest })
    expect(usePlansStore.getState().plans.map((p) => p.programId)).toEqual(['p1', 'p5', 'p2'])
  })

  it('a guest with nothing from a program has no work', () => {
    enableGuestTracking()
    usePlansStore.getState().addPlan()
    expect(captureGuestWork()).toBeNull()
  })
})
