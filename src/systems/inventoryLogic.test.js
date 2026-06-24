import { describe, it, expect } from 'vitest'
import { countInSlots, addToSlots, removeFromSlots } from './inventoryLogic'

describe('inventoryLogic', () => {
  it('counts matching items across slots', () => {
    const slots = [{ itemId: 'turnip_seed', count: 5 }, null, { itemId: 'turnip_seed', count: 2 }]
    expect(countInSlots(slots, 'turnip_seed')).toBe(7)
    expect(countInSlots(slots, 'carrot_seed')).toBe(0)
  })

  it('stacks into an existing matching slot up to stackMax', () => {
    const slots = [{ itemId: 'turnip_seed', count: 95 }, null]
    const { slots: next, remaining } = addToSlots(slots, 'turnip_seed', 10, 99)
    expect(next[0]).toEqual({ itemId: 'turnip_seed', count: 99 })
    expect(next[1]).toEqual({ itemId: 'turnip_seed', count: 6 })
    expect(remaining).toBe(0)
  })

  it('does not mutate the input array', () => {
    const slots = [null]
    addToSlots(slots, 'turnip_seed', 1, 99)
    expect(slots[0]).toBeNull()
  })

  it('reports remaining when slots are full', () => {
    const slots = [{ itemId: 'turnip_seed', count: 99 }]
    const { remaining } = addToSlots(slots, 'turnip_seed', 5, 99)
    expect(remaining).toBe(5)
  })

  it('removes across slots and clears emptied slots to null', () => {
    const slots = [{ itemId: 'turnip_seed', count: 3 }, { itemId: 'turnip_seed', count: 4 }]
    const { slots: next, removed } = removeFromSlots(slots, 'turnip_seed', 5)
    expect(removed).toBe(5)
    expect(next[0]).toBeNull()
    expect(next[1]).toEqual({ itemId: 'turnip_seed', count: 2 })
  })

  it('reports partial removal when not enough present', () => {
    const slots = [{ itemId: 'turnip_seed', count: 2 }]
    const { removed } = removeFromSlots(slots, 'turnip_seed', 5)
    expect(removed).toBe(2)
  })
})
