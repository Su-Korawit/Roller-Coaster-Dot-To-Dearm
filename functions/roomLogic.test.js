import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { ROOM_CATALOG, STARTER_ITEMS } from '../src/data/roomCatalogSeed'

const require = createRequire(import.meta.url)
const logic = require('./roomLogic.js')
const { planPurchase, planWelcomePack } = logic

const lamp = { kind: 'decor', price: 90, tierMin: 0 }
const theme = { kind: 'theme', price: 1500, tierMin: 0 }
const upper = { kind: 'furniture', price: 100, tierMin: 1 }
const caught = (fn) => {
  try {
    fn()
  } catch (e) {
    return e
  }
  return null
}

describe('planPurchase', () => {
  it('charges the price and adds one copy', () => {
    expect(planPurchase({ item: lamp, itemId: 'lamp', leaves: 200, inventory: {}, currentTier: 0 })).toEqual({
      price: 90,
      inventoryDelta: { lamp: 1 },
    })
  })

  it('allows spending exactly all Leaves', () => {
    expect(planPurchase({ item: lamp, itemId: 'lamp', leaves: 90, inventory: {}, currentTier: 0 }).price).toBe(90)
  })

  it('refuses one Leaf short and says how many are missing', () => {
    const e = caught(() => planPurchase({ item: lamp, itemId: 'lamp', leaves: 89, inventory: {}, currentTier: 0 }))
    expect(e.code).toBe('failed-precondition')
    expect(e.extra).toEqual({ reason: 'INSUFFICIENT_LEAVES', missing: 1 })
  })

  it('refuses an unknown item', () => {
    expect(caught(() => planPurchase({ item: null, itemId: 'x', leaves: 999, inventory: {}, currentTier: 0 }))?.code).toBe('not-found')
  })

  it('lets furniture be bought again but not unique kinds', () => {
    expect(planPurchase({ item: lamp, itemId: 'lamp', leaves: 500, inventory: { lamp: 3 }, currentTier: 0 }).inventoryDelta).toEqual({ lamp: 1 })
    const e = caught(() => planPurchase({ item: theme, itemId: 'cafe', leaves: 5000, inventory: { cafe: 1 }, currentTier: 0 }))
    expect(e.extra.reason).toBe('ALREADY_OWNED')
  })

  it('gates items on the room tier', () => {
    const e = caught(() => planPurchase({ item: upper, itemId: 'sofa', leaves: 999, inventory: {}, currentTier: 0 }))
    expect(e.extra.reason).toBe('TIER_REQUIRED')
    expect(planPurchase({ item: upper, itemId: 'sofa', leaves: 999, inventory: {}, currentTier: 1 }).price).toBe(100)
  })

  it('a tier needs the previous tier first (requires), whatever the current layout tier is', () => {
    const tier2 = { kind: 'tier', price: 3000, tierMin: 0, requires: 'tier_1' }
    const e = caught(() => planPurchase({ item: tier2, itemId: 'tier_2', leaves: 9999, inventory: {}, currentTier: 0 }))
    expect(e.code).toBe('failed-precondition')
    expect(e.extra).toEqual({ reason: 'REQUIRES_MISSING', requires: 'tier_1' })
    expect(planPurchase({ item: tier2, itemId: 'tier_2', leaves: 9999, inventory: { tier_1: 1 }, currentTier: 0 }).price).toBe(3000)
  })

  it('treats an invalid price as unbuyable', () => {
    const bad = { kind: 'decor', price: -5, tierMin: 0 }
    expect(caught(() => planPurchase({ item: bad, itemId: 'x', leaves: 999, inventory: {}, currentTier: 0 }))?.code).toBe('failed-precondition')
  })
})

describe('planWelcomePack', () => {
  it('grants once', () => {
    expect(planWelcomePack({ welcomePack: undefined })).toEqual({ grant: true })
    expect(planWelcomePack({ welcomePack: 'v2' })).toEqual({ grant: false })
  })
})

describe('starter data parity with the client seed', () => {
  it('uses the same starter set and only catalog ids', () => {
    expect(logic.STARTER_ITEMS).toEqual(STARTER_ITEMS)
    for (const id of Object.keys(logic.STARTER_ITEMS)) expect(ROOM_CATALOG[id]).toBeTruthy()
    expect(logic.WELCOME_LEAVES).toBe(100)
  })

  it('has a default layout that places only starter items, desk items on the desk', () => {
    const { placed } = logic.STARTER_LAYOUT
    for (const p of placed) expect(logic.STARTER_ITEMS[p.itemId], p.itemId).toBeGreaterThan(0)
    const desk = placed.find((p) => p.itemId === 'desk_basic')
    expect(desk).toBeTruthy()
    for (const p of placed.filter((q) => q.slot)) expect([p.x, p.y]).toEqual([desk.x, desk.y])
  })
})
