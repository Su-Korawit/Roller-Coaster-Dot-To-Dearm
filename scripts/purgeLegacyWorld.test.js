import { describe, it, expect } from 'vitest'
import {
  LEGACY_COLLECTIONS, LEGACY_USER_FIELDS, PROTECTED_USER_FIELDS, PROTECTED_COLLECTIONS, planPurge, legacyFieldsPresent,
} from './legacyWorldPlan.mjs'

describe('legacy world purge plan', () => {
  it('targets exactly the farm and Personal Map collections', () => {
    expect(LEGACY_COLLECTIONS).toEqual(['farmPlants', 'farmItems', 'farmShops', 'maps'])
  })

  it('never lists a protected collection or user field', () => {
    for (const name of PROTECTED_COLLECTIONS) expect(LEGACY_COLLECTIONS).not.toContain(name)
    for (const field of PROTECTED_USER_FIELDS) expect(LEGACY_USER_FIELDS).not.toContain(field)
  })

  it('keeps Coins, focus XP and the study room data out of the purge', () => {
    for (const field of ['coins', 'focusXp', 'leaves', 'roomInventory', 'welcomePack']) {
      expect(PROTECTED_USER_FIELDS).toContain(field)
    }
  })

  it('plans one step per legacy collection and field with the counts it was given', () => {
    const plan = planPurge({ collections: { farmPlants: 12, maps: 40 }, userFields: { farmGold: 7 } })
    expect(plan.steps).toHaveLength(LEGACY_COLLECTIONS.length + LEGACY_USER_FIELDS.length)
    expect(plan.steps.find((s) => s.name === 'maps')).toEqual({ kind: 'delete-collection', name: 'maps', count: 40 })
    expect(plan.steps.find((s) => s.name === 'farmGold')).toEqual({ kind: 'unset-user-field', name: 'farmGold', count: 7 })
    expect(plan.total).toBe(59)
  })

  it('plans nothing to do for an already clean project', () => {
    expect(planPurge({}).total).toBe(0)
  })

  it('finds only the legacy fields on a user document', () => {
    expect(legacyFieldsPresent({ coins: 5, leaves: 9, farmGold: 1, inventory: {} })).toEqual(['inventory', 'farmGold'])
    expect(legacyFieldsPresent({ coins: 5 })).toEqual([])
    expect(legacyFieldsPresent(undefined)).toEqual([])
  })
})
