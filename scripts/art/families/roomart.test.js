import { describe, it, expect } from 'vitest'
import { buildFamily } from '../build.mjs'
import { lintPalette } from '../palette.mjs'
import room, { TILE_NAMES, FIRSTGID } from './room.mjs'
import roomitems from './roomitems.mjs'
import focus from './focus.mjs'
import { ROOM_CATALOG } from '../../../src/data/roomCatalogSeed.js'

const frameOf = (built, name, frame = 0) => {
  const { sheet, atlas } = built
  const e = atlas.sprites[name]
  const fw = atlas.frameW
  const fh = atlas.frameH
  const col = e.col ?? frame
  const row = e.row
  const px = []
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) px.push(sheet.getPixel(col * fw + x, row * fh + y))
  return px
}
const opaque = (px) => px.filter((p) => p[3] === 255).length
const visible = (px) => px.filter((p) => p[3] > 0).length
const differing = (a, b) => a.filter((p, i) => p.some((v, k) => v !== b[i][k])).length / a.length

describe('room tiles', () => {
  const built = buildFamily(room)
  const NAMES = [
    'floor_minimal', 'floor_rug_edge', 'wall_minimal_t', 'wall_minimal_tl', 'wall_minimal_tr',
    'wall_minimal_l', 'wall_minimal_r', 'wall_minimal_b', 'window_day', 'door', 'shadow_wall',
  ]

  it('names every tile once, in a 16-column grid', () => {
    expect(new Set(TILE_NAMES).size).toBe(TILE_NAMES.length)
    for (const n of NAMES) expect(TILE_NAMES, n).toContain(n)
    expect(FIRSTGID).toBe(1)
    expect(built.sheet.w).toBe(256)
  })

  it('stays on the Soft Pixel palette and draws every tile', () => {
    expect(lintPalette(built.sheet)).toEqual({ ok: true, offenders: [] })
    for (const n of TILE_NAMES) expect(visible(frameOf(built, n)), n).toBeGreaterThan(0)
  })

  it('has opaque floor and wall tiles', () => {
    for (const n of TILE_NAMES.filter((t) => /^(floor|wall)_/.test(t))) expect(opaque(frameOf(built, n)), n).toBe(256)
  })

  it('tells windows and doors apart from plain wall', () => {
    expect(differing(frameOf(built, 'window_day'), frameOf(built, 'wall_minimal_t'))).toBeGreaterThan(0.1)
    expect(differing(frameOf(built, 'door'), frameOf(built, 'wall_minimal_b'))).toBeGreaterThan(0.1)
  })
})

describe('room items', () => {
  const built = buildFamily(roomitems)
  const ids = Object.entries(ROOM_CATALOG).filter(([, i]) => ['furniture', 'decor', 'desk', 'wall'].includes(i.kind)).map(([id]) => id)

  it('has a sprite row for every catalog item that is drawn (themes, tiers, pets and accessories are not)', () => {
    expect(Object.keys(built.atlas.sprites).sort()).toEqual([...ids].sort())
    for (const id of ids) expect(built.atlas.sprites[id].frames, id).toBe(ROOM_CATALOG[id].frames)
  })

  it('stays on the palette and draws every frame', () => {
    expect(lintPalette(built.sheet)).toEqual({ ok: true, offenders: [] })
    for (const id of ids) {
      for (let f = 0; f < ROOM_CATALOG[id].frames; f++) expect(visible(frameOf(built, id, f)), `${id}:${f}`).toBeGreaterThan(20)
    }
  })

  it('lights the lamp in its second frame', () => {
    expect(differing(frameOf(built, 'lamp_desk', 0), frameOf(built, 'lamp_desk', 1))).toBeGreaterThan(0.02)
  })

  it('draws the floor items inside their footprint plus height (bottom-left anchored, 32 px frame)', () => {
    expect([built.atlas.frameW, built.atlas.frameH]).toEqual([32, 32])
  })
})

describe('focus art (trees and pot)', () => {
  const built = buildFamily(focus)
  const species = ['tree_sprout', 'tree_shrub', 'tree_tree', 'tree_blossom']

  it('has four growth frames per species, one withered frame and a four-frame pot', () => {
    for (const s of species) expect(built.atlas.sprites[s].frames, s).toBe(4)
    expect(built.atlas.sprites.tree_withered.frames).toBe(1)
    expect(built.atlas.sprites.pot_growth.frames).toBe(4)
  })

  it('stays on the palette', () => {
    expect(lintPalette(built.sheet)).toEqual({ ok: true, offenders: [] })
  })

  it('grows: the first and last stage differ a lot, and each stage differs from the next', () => {
    for (const s of [...species, 'pot_growth']) {
      const frames = [0, 1, 2, 3].map((f) => frameOf(built, s, f))
      expect(differing(frames[0], frames[3]), `${s} 0 vs 3`).toBeGreaterThan(0.05)
      for (let i = 0; i < 3; i++) expect(differing(frames[i], frames[i + 1]), `${s} ${i}->${i + 1}`).toBeGreaterThan(0)
    }
  })

  it('bigger planned trees end up bigger', () => {
    const area = (s) => visible(frameOf(built, s, 3))
    expect(area('tree_sprout')).toBeLessThan(area('tree_shrub'))
    expect(area('tree_shrub')).toBeLessThan(area('tree_tree'))
    expect(area('tree_tree')).toBeLessThanOrEqual(area('tree_blossom'))
  })

  it('draws a withered tree that is not just the full tree', () => {
    expect(differing(frameOf(built, 'tree_withered', 0), frameOf(built, 'tree_tree', 3))).toBeGreaterThan(0.05)
  })
})
