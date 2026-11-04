import { describe, it, expect } from 'vitest'
import { ROOM_CATALOG, STARTER_ITEMS } from './roomCatalogSeed'

const KINDS = ['furniture', 'decor', 'desk', 'wall', 'pet', 'outfit', 'accessory', 'theme', 'tier']
const SLOTS_ITEMS = ['lamp_desk', 'mug', 'books_stack', 'plant_small', 'laptop']

describe('ROOM_CATALOG seed', () => {
  const rows = Object.entries(ROOM_CATALOG)

  it('gives every item the fields the room needs', () => {
    for (const [id, item] of rows) {
      expect(typeof item.name, id).toBe('string')
      expect(KINDS, id).toContain(item.kind)
      expect(Number.isInteger(item.price) && item.price >= 0, id).toBe(true)
      expect(item.footprint, id).toHaveLength(2)
      expect(item.footprint.every((n) => Number.isInteger(n) && n > 0), id).toBe(true)
      expect(typeof item.spriteKey, id).toBe('string')
      expect(Number.isInteger(item.frames) && item.frames >= 1, id).toBe(true)
      expect(Number.isInteger(item.tierMin) && item.tierMin >= 0, id).toBe(true)
    }
  })

  it('has the planned furniture, desk-slot items and the free minimal theme', () => {
    for (const id of ['desk_basic', 'chair_basic', 'bed_basic', 'bookshelf_basic', 'rug_round', 'poster_pastel', 'theme_minimal', ...SLOTS_ITEMS]) {
      expect(ROOM_CATALOG[id], id).toBeTruthy()
    }
    expect(ROOM_CATALOG.desk_basic.kind).toBe('desk')
    expect(ROOM_CATALOG.theme_minimal).toMatchObject({ kind: 'theme', price: 0 })
  })

  it('marks exactly the small desk items as desk-slot items, all 1×1', () => {
    const slotted = rows.filter(([, i]) => i.deskSlot).map(([id]) => id).sort()
    expect(slotted).toEqual([...SLOTS_ITEMS].sort())
    for (const id of SLOTS_ITEMS) expect(ROOM_CATALOG[id].footprint).toEqual([1, 1])
  })

  it('seeds the three tiers in order with the spec prices and a requires chain', () => {
    expect(ROOM_CATALOG.tier_1).toMatchObject({ kind: 'tier', price: 1200 })
    expect(ROOM_CATALOG.tier_2).toMatchObject({ kind: 'tier', price: 3000, requires: 'tier_1' })
    expect(ROOM_CATALOG.tier_3).toMatchObject({ kind: 'tier', price: 6000, requires: 'tier_2' })
    expect(ROOM_CATALOG.tier_1.requires).toBeUndefined()
  })

  it('seeds the three paid themes at 1,500 (ids use underscores: layout.theme is the part after theme_)', () => {
    for (const id of ['theme_library_wood', 'theme_cafe', 'theme_night_sky']) expect(ROOM_CATALOG[id], id).toMatchObject({ kind: 'theme', price: 1500 })
  })

  it('seeds four pets at 600 Leaves', () => {
    const pets = rows.filter(([, i]) => i.kind === 'pet')
    expect(pets.map(([id]) => id).sort()).toEqual(['pet_bunny', 'pet_cat_black', 'pet_cat_orange', 'pet_shiba'])
    for (const [, i] of pets) expect(i.price).toBe(600)
  })

  it('seeds eight accessories, two per slot', () => {
    const acc = rows.filter(([, i]) => i.kind === 'accessory')
    expect(acc).toHaveLength(8)
    for (const slot of ['head', 'face', 'neck', 'back']) expect(acc.filter(([, i]) => i.slot === slot), slot).toHaveLength(2)
    for (const [id, i] of acc) expect(i.price >= 250 && i.price <= 500, id).toBe(true)
  })

  it('seeds the pet bed and trophy shelf as drawable room items', () => {
    expect(ROOM_CATALOG.pet_bed).toMatchObject({ kind: 'decor' })
    expect(ROOM_CATALOG.trophy_shelf).toMatchObject({ kind: 'furniture', price: 300 })
  })

  it('prices furniture between 80 and 400 Leaves', () => {
    for (const [id, i] of rows.filter(([, i]) => i.price > 0 && ['furniture', 'decor', 'desk', 'wall'].includes(i.kind))) {
      expect(i.price, id).toBeGreaterThanOrEqual(80)
      expect(i.price, id).toBeLessThanOrEqual(400)
    }
  })

  it('has a starter set made only of catalog ids, with positive integer counts', () => {
    expect(STARTER_ITEMS).toEqual({
      desk_basic: 1, chair_basic: 1, bed_basic: 1, bookshelf_basic: 1,
      lamp_desk: 1, plant_small: 1, rug_round: 1, theme_minimal: 1,
    })
    for (const [id, n] of Object.entries(STARTER_ITEMS)) {
      expect(ROOM_CATALOG[id], id).toBeTruthy()
      expect(Number.isInteger(n) && n > 0).toBe(true)
    }
  })
})
