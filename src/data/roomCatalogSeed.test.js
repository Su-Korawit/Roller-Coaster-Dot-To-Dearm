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

  it('does not seed tiers or pets yet (second plan)', () => {
    expect(rows.filter(([, i]) => i.kind === 'tier' || i.kind === 'pet')).toEqual([])
  })

  it('prices furniture between 80 and 400 Leaves', () => {
    for (const [id, i] of rows.filter(([, i]) => i.price > 0)) {
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
