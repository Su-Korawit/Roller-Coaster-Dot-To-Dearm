import { describe, it, expect, beforeEach } from 'vitest'
import { usePlansStore } from './usePlansStore'

describe('usePlansStore', () => {
  beforeEach(() => usePlansStore.getState().resetPlans())

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
})
