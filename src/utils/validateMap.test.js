import { describe, it, expect } from 'vitest'
import { validateMap } from './validateMap'

const okMeta = {
  spawns: [{ name: 'entry', x: 0, y: 0, isDefault: true }],
  defaultSpawnName: 'entry',
  portals: [{ x: 0, y: 0, width: 16, height: 16, target: 'cave', targetSpawn: 'entry' }],
}

describe('validateMap', () => {
  it('passes a well-formed map (target exists)', () => {
    const r = validateMap({ meta: okMeta, unmatchedTilesets: [], existingMapKeys: ['cave'] })
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
  })
  it('hard-errors when there are no spawns', () => {
    const r = validateMap({ meta: { spawns: [], defaultSpawnName: null, portals: [] }, unmatchedTilesets: [], existingMapKeys: [] })
    expect(r.errors.some((e) => e.includes('Spawns'))).toBe(true)
  })
  it('hard-errors on unmatched tilesets', () => {
    const r = validateMap({ meta: okMeta, unmatchedTilesets: ['Lava'], existingMapKeys: ['cave'] })
    expect(r.errors.some((e) => e.includes('Lava'))).toBe(true)
  })
  it('warns when a portal target does not exist yet', () => {
    const r = validateMap({ meta: okMeta, unmatchedTilesets: [], existingMapKeys: [] })
    expect(r.errors).toEqual([])
    expect(r.warnings.some((w) => w.includes('cave'))).toBe(true)
  })
  it('warns when the map has no portals', () => {
    const r = validateMap({ meta: { ...okMeta, portals: [] }, unmatchedTilesets: [], existingMapKeys: [] })
    expect(r.warnings.some((w) => w.toLowerCase().includes('portal'))).toBe(true)
  })
})
