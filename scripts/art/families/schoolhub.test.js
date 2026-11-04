import { describe, it, expect } from 'vitest'
import { buildFamily } from '../build.mjs'
import { lintPalette } from '../palette.mjs'
import family, { TILE_NAMES, FIRSTGID } from './schoolhub.mjs'

const ROOFS = ['sky', 'blue', 'red', 'purple', 'green']
const ROOF_PARTS = ['tl', 't', 'tr', 'tl2', 't2', 'tr2', 'ml', 'm', 'mr', 'bl2', 'b2', 'br2', 'bl', 'b', 'br']
const range = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`)
const REQUIRED = [
  'grass', ...range('grass_tuft', 3), ...range('grass_patch', 4), ...range('grass_flower', 2),
  ...['tl', 't', 'tr', 'l', 'c', 'r', 'bl', 'b', 'br'].map((p) => `lawn_${p}`),
  ...['tl', 't', 'tr', 'l', 'c', 'r', 'bl', 'b', 'br', 'c2', 'nw', 'ne', 'sw', 'se'].map((p) => `path_${p}`),
  'floor',
  ...['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br'].map((p) => `wall_${p}`), 'wall_window', 'wall_door',
  ...ROOFS.flatMap((c) => ROOF_PARTS.map((p) => `roof_${c}_${p}`)),
  ...[1, 2].flatMap((t) => ['tl', 'tr', 'bl', 'br'].map((p) => `tree${t}_${p}`)),
  ...range('flower', 5), ...range('mushroom', 4), ...range('bush', 2), ...range('rock', 4), ...range('stump', 2),
  'log', 'sunflower_top', 'sunflower_stem', 'hedge_l', 'hedge_m', 'hedge_r',
  'bookshelf', 'chair_front', 'chair_back', 'table', 'plant', 'fence_h', 'fence_v',
]

const { sheet, atlas } = buildFamily(family)
const tileAt = (name) => {
  const { col, row } = atlas.sprites[name]
  const px = []
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px.push(sheet.getPixel(col * 16 + x, row * 16 + y))
  return px
}
const opaque = (name) => tileAt(name).filter((p) => p[3] === 255).length
const same = (a, b) => tileAt(a).every((p, i) => p.every((v, k) => v === tileAt(b)[i][k]))

describe('School Hub tileset', () => {
  it('names every tile the map needs, once, in a stable order', () => {
    expect(new Set(TILE_NAMES).size).toBe(TILE_NAMES.length)
    for (const name of REQUIRED) expect(TILE_NAMES, name).toContain(name)
    expect(FIRSTGID).toBe(1)
  })

  it('is a 16-column grid of 16 px tiles', () => {
    expect(sheet.w).toBe(256)
    expect(sheet.h).toBe(Math.ceil(TILE_NAMES.length / 16) * 16)
    expect(atlas.columns).toBe(16)
  })

  it('stays on the Soft Pixel palette', () => {
    expect(lintPalette(sheet)).toEqual({ ok: true, offenders: [] })
  })

  it('draws something in every tile', () => {
    for (const name of TILE_NAMES) expect(opaque(name), name).toBeGreaterThan(0)
  })

  it('has fully opaque ground tiles (no see-through seams)', () => {
    for (const name of TILE_NAMES.filter((n) => /^(grass|path_|lawn_|floor)/.test(n) && !/flower/.test(n))) {
      expect(opaque(name), name).toBe(256)
    }
  })

  it('draws the roof colours differently', () => {
    for (let i = 0; i < ROOFS.length; i++) {
      for (let j = i + 1; j < ROOFS.length; j++) expect(same(`roof_${ROOFS[i]}_t`, `roof_${ROOFS[j]}_t`)).toBe(false)
    }
  })

  it('tells doors and windows apart from plain wall', () => {
    expect(same('wall_door', 'wall_t')).toBe(false)
    expect(same('wall_window', 'wall_t')).toBe(false)
  })
})
