import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { validateLayout, canPlace, TIER_SIZES, GRID, TILE } from './placement'
import { ROOM_CATALOG, STARTER_ITEMS } from '../data/roomCatalogSeed'
import fixtures from './placementFixtures.json'

const require = createRequire(import.meta.url)
const server = require('../../functions/placement.js')
const roomLogic = require('../../functions/roomLogic.js')

const codesOf = (r) => [...new Set(r.errors.map((e) => e.code))].sort()

describe('validateLayout (client)', () => {
  it.each(fixtures.cases.map((c) => [c.name, c]))('%s', (_n, c) => {
    const r = validateLayout({ layout: c.layout, catalog: fixtures.catalog, inventory: c.inventory })
    expect(codesOf(r)).toEqual([...c.codes].sort())
    expect(r.ok).toBe(c.codes.length === 0)
  })

  it('agrees with the server module on every fixture', () => {
    for (const c of fixtures.cases) {
      const input = { layout: c.layout, catalog: fixtures.catalog, inventory: c.inventory }
      expect(server.validateLayout(input)).toEqual(validateLayout(input))
    }
  })

  it('points each error at the offending placement', () => {
    const r = validateLayout({
      layout: { tier: 0, theme: 'minimal', petId: null, placed: [{ itemId: 'chair_basic', x: 32, y: 32 }, { itemId: 'chair_basic', x: 4, y: 32 }] },
      catalog: fixtures.catalog,
      inventory: { chair_basic: 2, theme_minimal: 1 },
    })
    expect(r.errors).toEqual([{ code: 'off_grid', index: 1, itemId: 'chair_basic' }])
  })

  it('accepts the starter layout with the starter inventory and the real seed catalog', () => {
    const r = validateLayout({ layout: roomLogic.STARTER_LAYOUT, catalog: ROOM_CATALOG, inventory: STARTER_ITEMS })
    expect(r).toEqual({ ok: true, errors: [] })
  })

  it('tolerates a malformed placement instead of throwing', () => {
    const r = validateLayout({ layout: { tier: 0, theme: 'minimal', petId: null, placed: [null, { itemId: 5 }] }, catalog: fixtures.catalog, inventory: {} })
    expect(r.ok).toBe(false)
  })
})

describe('canPlace', () => {
  const base = { tier: 0, theme: 'minimal', petId: null, placed: [{ itemId: 'chair_basic', x: 32, y: 32 }] }
  const inv = { chair_basic: 2, lamp_desk: 1, desk_basic: 1, theme_minimal: 1 }

  it('allows a free spot and refuses an overlapping one', () => {
    expect(canPlace({ layout: base, catalog: fixtures.catalog, inventory: inv, itemId: 'chair_basic', x: 64, y: 64 })).toBe(true)
    expect(canPlace({ layout: base, catalog: fixtures.catalog, inventory: inv, itemId: 'chair_basic', x: 32, y: 32 })).toBe(false)
  })

  it('refuses when no copy is left to place', () => {
    const full = { ...base, placed: [{ itemId: 'lamp_desk', x: 96, y: 32, slot: 'left' }, { itemId: 'desk_basic', x: 96, y: 32 }] }
    expect(canPlace({ layout: full, catalog: fixtures.catalog, inventory: inv, itemId: 'lamp_desk', x: 96, y: 32, slot: 'right' })).toBe(false)
  })

  it('exposes the grid constants', () => {
    expect(GRID).toBe(8)
    expect(TILE).toBe(16)
    expect(TIER_SIZES[0]).toEqual({ w: 11, h: 9 })
  })
})

describe('layout header checks (review minors)', () => {
  const base = { tier: 0, theme: 'minimal', petId: null, placed: [] }
  const inv = { theme_minimal: 1, desk_basic: 1 }
  const cat = { theme_minimal: { kind: 'theme', footprint: [1, 1] }, desk_basic: { kind: 'desk', footprint: [4, 2] } }

  it('rejects a non-integer tier', () => {
    expect(validateLayout({ layout: { ...base, tier: '0' }, catalog: cat, inventory: inv }).errors.map((e) => e.code)).toContain('bad_tier')
  })

  it('rejects a pet id that is not a pet', () => {
    expect(validateLayout({ layout: { ...base, petId: 'desk_basic' }, catalog: cat, inventory: inv }).errors.map((e) => e.code)).toContain('bad_pet')
  })
})
