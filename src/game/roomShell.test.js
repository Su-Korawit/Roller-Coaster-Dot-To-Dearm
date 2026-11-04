import { describe, it, expect } from 'vitest'
import { layerTier, layerActive, shellBounds, themeGid, tierSpawnName, portalActive, insideOwnedArea } from './roomShell'
import { TILE_NAMES, FIRSTGID } from '../../scripts/art/families/room.mjs'
import { TIER_AREAS } from '../room/placement'

const gid = (name) => FIRSTGID + TILE_NAMES.indexOf(name)

describe('layerTier / layerActive', () => {
  it('reads the tier of a shell layer from its name; other layers belong to no tier', () => {
    expect(layerTier('Floor')).toBe(0)
    expect(layerTier('Wall')).toBe(0)
    expect(layerTier('Decor_t2')).toBe(2)
    expect(layerTier('Wall_t3')).toBe(3)
    expect(layerTier('Portals')).toBeNull()
    expect(layerTier('Roof')).toBeNull()
    expect(layerTier('Floor_t9')).toBeNull()
  })

  it('shows only the owned tier’s shell and every non-shell layer', () => {
    const names = ['Floor', 'Wall', 'Decor', 'Floor_t1', 'Wall_t1', 'Wall_t2', 'Wall_t3', 'Portals']
    expect(names.filter((n) => layerActive(n, 0))).toEqual(['Floor', 'Wall', 'Decor', 'Portals'])
    expect(names.filter((n) => layerActive(n, 1))).toEqual(['Floor_t1', 'Wall_t1', 'Portals'])
    expect(names.filter((n) => layerActive(n, 2))).toEqual(['Wall_t2', 'Portals'])
  })

  it('an unknown tier falls back to the starter shell', () => {
    expect(layerActive('Wall', 7)).toBe(true)
    expect(layerActive('Wall_t1', 7)).toBe(false)
  })
})

describe('shellBounds', () => {
  it('is the bounding box of the owned areas in px', () => {
    expect(shellBounds(0)).toEqual({ x: 0, y: 0, w: 11 * 16, h: 9 * 16 })
    expect(shellBounds(1)).toEqual({ x: 0, y: 0, w: 14 * 16, h: 10 * 16 })
    expect(shellBounds(2)).toEqual({ x: 0, y: 0, w: 20 * 16, h: 10 * 16 })
    expect(shellBounds(3)).toEqual({ x: 0, y: 0, w: 20 * 16, h: 19 * 16 })
    expect(Object.keys(TIER_AREAS)).toHaveLength(4)
  })
  it('an unknown tier is the starter room', () => {
    expect(shellBounds(42)).toEqual(shellBounds(0))
  })
})

describe('themeGid', () => {
  const opts = { tileNames: TILE_NAMES, firstgid: FIRSTGID }

  it('leaves the minimal theme, empty cells and unrelated tiles alone', () => {
    expect(themeGid(gid('floor_minimal'), 'minimal', opts)).toBe(gid('floor_minimal'))
    expect(themeGid(0, 'cafe', opts)).toBe(0)
    expect(themeGid(gid('door'), 'cafe', opts)).toBe(gid('door'))
    expect(themeGid(gid('shadow_wall'), 'night_sky', opts)).toBe(gid('shadow_wall'))
    expect(themeGid(gid('balcony_floor'), 'cafe', opts)).toBe(gid('balcony_floor'))
  })

  it('swaps floor, every wall piece and the window for the theme twin', () => {
    expect(themeGid(gid('floor_minimal'), 'cafe', opts)).toBe(gid('floor_cafe'))
    for (const w of ['t', 'tl', 'tr', 'l', 'r', 'b']) {
      expect(themeGid(gid(`wall_minimal_${w}`), 'library_wood', opts)).toBe(gid(`wall_library_wood_${w}`))
    }
    expect(themeGid(gid('window_day'), 'night_sky', opts)).toBe(gid('window_night_sky'))
  })

  it('falls back to the original tile for an unknown theme or a gid outside the table', () => {
    expect(themeGid(gid('floor_minimal'), 'disco', opts)).toBe(gid('floor_minimal'))
    expect(themeGid(9999, 'cafe', opts)).toBe(9999)
    expect(themeGid(-3, 'cafe', opts)).toBe(-3)
  })
})

describe('object filters', () => {
  it('picks the entry spawn of the tier when the map has one, else the plain name', () => {
    const names = ['entry', 'entry_t1', 'entry_t2', 'entry_t3']
    expect(tierSpawnName('entry', 0, names)).toBe('entry')
    expect(tierSpawnName('entry', 2, names)).toBe('entry_t2')
    expect(tierSpawnName('entry', 2, ['entry'])).toBe('entry')
    expect(tierSpawnName(null, 2, names)).toBeNull()
  })

  it('keeps untagged portals and the portal of the owned tier only', () => {
    expect(portalActive({ tier: null }, 2)).toBe(true)
    expect(portalActive({ tier: undefined }, 2)).toBe(true)
    expect(portalActive({ tier: 2 }, 2)).toBe(true)
    expect(portalActive({ tier: 1 }, 2)).toBe(false)
    expect(portalActive({ tier: 0 }, 0)).toBe(true)
  })
})

describe('insideOwnedArea (review C1: never start outside the owned walls)', () => {
  it('is true on the floor of an owned area and false in the void around it', () => {
    expect(insideOwnedArea(0, 88, 72)).toBe(true) // middle of the starter room
    expect(insideOwnedArea(0, 12 * 16, 4 * 16)).toBe(false) // east of the 11-tile room
    expect(insideOwnedArea(1, 12 * 16, 4 * 16)).toBe(true)
    expect(insideOwnedArea(1, 16 * 16, 4 * 16)).toBe(false) // the balcony is not tier 1
    expect(insideOwnedArea(2, 16 * 16, 4 * 16)).toBe(true)
    expect(insideOwnedArea(2, 4 * 16, 12 * 16)).toBe(false) // the second room is not tier 2
    expect(insideOwnedArea(3, 4 * 16, 12 * 16)).toBe(true)
  })
  it('rejects junk and an unknown tier is the starter room', () => {
    expect(insideOwnedArea(0, NaN, 10)).toBe(false)
    expect(insideOwnedArea(0, undefined, undefined)).toBe(false)
    expect(insideOwnedArea(9, 88, 72)).toBe(true)
    expect(insideOwnedArea(9, 12 * 16, 4 * 16)).toBe(false)
  })
})
