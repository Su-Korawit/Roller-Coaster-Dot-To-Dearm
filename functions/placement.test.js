import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import fixtures from '../src/room/placementFixtures.json'

const require = createRequire(import.meta.url)
const { validateLayout, canPlace, TIER_SIZES, GRID, TILE } = require('./placement.js')

const codesOf = (r) => [...new Set(r.errors.map((e) => e.code))].sort()

describe('validateLayout (server)', () => {
  it.each(fixtures.cases.map((c) => [c.name, c]))('%s', (_n, c) => {
    const r = validateLayout({ layout: c.layout, catalog: fixtures.catalog, inventory: c.inventory })
    expect(codesOf(r)).toEqual([...c.codes].sort())
  })

  it('exposes the same constants and canPlace', () => {
    expect([GRID, TILE, TIER_SIZES[0]]).toEqual([8, 16, { w: 11, h: 9 }])
    expect(typeof canPlace).toBe('function')
  })
})
