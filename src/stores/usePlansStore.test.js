import { describe, it, expect, beforeEach, vi } from 'vitest'

const entitlementsMock = vi.hoisted(() => ({ extra: 0 }))
vi.mock('./useEntitlementsStore', () => ({
  useEntitlementsStore: { getState: () => ({ extraPlanSlots: () => entitlementsMock.extra }) },
}))

const { usePlansStore } = await import('./usePlansStore')

describe('usePlansStore', () => {
  beforeEach(() => {
    entitlementsMock.extra = 0
    usePlansStore.getState().resetPlans()
  })

  it('adding a program tells the Guide (planned) once, and a refused add does not', async () => {
    const { onGuideEvent } = await import('../lib/guideEvents')
    const seen = []
    const off = onGuideEvent((e) => seen.push(e))
    const program = { universityId: 'u1', universityName: 'U', programId: 'p1', programName: 'P', buildingId: 'med', round: 1, projectName: null, minGpax: null, scores: [] }
    expect(usePlansStore.getState().addFromProgram(program).ok).toBe(true)
    expect(usePlansStore.getState().addFromProgram(program).ok).toBe(false) // duplicate
    off()
    expect(seen).toEqual(['planned'])
  })

  it('adds a plan and makes it active', () => {
    const id = usePlansStore.getState().addPlan()
    const s = usePlansStore.getState()
    expect(s.plans).toHaveLength(1)
    expect(s.activePlanId).toBe(id)
  })

  it('updates a plan by id', () => {
    const id = usePlansStore.getState().addPlan()
    usePlansStore.getState().updatePlan(id, { university: 'u1' })
    expect(usePlansStore.getState().plans[0].university).toBe('u1')
  })

  it('removes a plan and reassigns active', () => {
    const a = usePlansStore.getState().addPlan()
    const b = usePlansStore.getState().addPlan()
    usePlansStore.getState().removePlan(b)
    expect(usePlansStore.getState().plans.map((p) => p.id)).toEqual([a])
    expect(usePlansStore.getState().activePlanId).toBe(a)
  })

  it('reorders by index (rank change)', () => {
    const a = usePlansStore.getState().addPlan()
    const b = usePlansStore.getState().addPlan()
    usePlansStore.getState().reorderPlans(1, 0)
    expect(usePlansStore.getState().plans.map((p) => p.id)).toEqual([b, a])
  })

  it('addPlan refuses beyond FREE_PLAN_SLOTS, then allows more with the entitlement', () => {
    for (let i = 0; i < 3; i++) expect(usePlansStore.getState().addPlan()).toBeTruthy()
    expect(usePlansStore.getState().addPlan()).toBeNull()
    expect(usePlansStore.getState().plans).toHaveLength(3)

    entitlementsMock.extra = 2
    expect(usePlansStore.getState().addPlan()).toBeTruthy()
    expect(usePlansStore.getState().plans).toHaveLength(4)
  })
})
