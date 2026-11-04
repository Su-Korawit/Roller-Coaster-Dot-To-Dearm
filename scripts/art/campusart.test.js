import { describe, it, expect } from 'vitest'
import { buildFamily } from './build.mjs'
import { lintPalette } from './palette.mjs'
import buildings, { FRAME_W, FRAME_H, DOOR } from './families/campusbuildings.mjs'
import tiles, { TILE_NAMES, FIRSTGID } from './families/campus.mjs'
import { BUILDING_IDS, BUILDINGS, ZONES } from '../../src/constants/openHouseBuildings.js'

describe('campus building sprites', () => {
  const { sheet, atlas } = buildFamily(buildings)

  it('has a 96×80 frame for each of the 18 faculties plus the hall and the gate', () => {
    expect(FRAME_W).toBe(96)
    expect(FRAME_H).toBe(80)
    expect(Object.keys(atlas.sprites)).toEqual([...BUILDING_IDS, 'hall', 'gate'])
    expect(sheet.w).toBe(96)
    expect(sheet.h).toBe(80 * 20)
  })

  it('uses only palette colours (no stray tints)', () => {
    expect(lintPalette(sheet).offenders).toEqual([])
  })

  it('every faculty sprite draws something solid and fills the bottom of its frame', () => {
    BUILDING_IDS.forEach((id, row) => {
      let opaque = 0
      for (let y = 0; y < 80; y++) for (let x = 0; x < 96; x++) if (sheet.getPixel(x, row * 80 + y)[3] === 255) opaque += 1
      expect(opaque, id).toBeGreaterThan(2500)
      // the ground line: the wall reaches the bottom edge of the building (y 74) somewhere
      let reaches = false
      for (let x = 0; x < 96; x++) if (sheet.getPixel(x, row * 80 + 74)[3] === 255) reaches = true
      expect(reaches, `${id} reaches the ground`).toBe(true)
    })
  })

  it('the door is centred on x 41–54 and open at the bottom of every faculty sprite', () => {
    expect(DOOR).toEqual({ x: 41, w: 14, bottom: 75 })
    BUILDING_IDS.forEach((id, row) => {
      if (id === 'agri') return // the greenhouse door is part of the glass front
      let solid = 0
      for (let x = DOOR.x; x < DOOR.x + DOOR.w; x++) if (sheet.getPixel(x, row * 80 + 66)[3] === 255) solid += 1
      expect(solid, `${id} door area`).toBe(DOOR.w)
    })
  })

  it('every faculty uses its zone colour', () => {
    BUILDINGS.forEach((b, row) => {
      const target = ZONES[b.zone].color.toUpperCase()
      let hits = 0
      for (let y = 0; y < 80; y++) for (let x = 0; x < 96; x++) {
        const [r, g, bl, a] = sheet.getPixel(x, row * 80 + y)
        if (a === 255 && `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}` === target) hits += 1
      }
      expect(hits, `${b.id} has ${b.zone} colour`).toBeGreaterThan(40)
    })
  })

  it('no two faculties are the same picture', () => {
    const rows = BUILDING_IDS.map((_, row) => {
      const parts = []
      for (let y = 0; y < 80; y++) for (let x = 0; x < 96; x++) parts.push(sheet.getPixel(x, row * 80 + y).join(','))
      return parts.join(';')
    })
    expect(new Set(rows).size).toBe(rows.length)
  })
})

describe('campus tiles', () => {
  const { sheet, atlas } = buildFamily(tiles)

  it('is a 16-column grid of 16×16 tiles whose names map to FIRSTGID + index', () => {
    expect(atlas.columns).toBe(16)
    expect(TILE_NAMES.length).toBe(Object.keys(atlas.sprites).length)
    expect(FIRSTGID).toBe(1)
    expect(new Set(TILE_NAMES).size).toBe(TILE_NAMES.length)
  })

  it('has every tile the map builder uses', () => {
    for (const name of ['grass', 'lawn', 'plaza', 'path', 'path_n', 'path_s', 'path_w', 'path_e', 'water', 'water2', 'lily', 'shore_n', 'bridge_v',
      'tree_tl', 'tree_tr', 'tree_bl', 'tree_br', 'bush', 'flowerbed1', 'lamp_top', 'lamp_base', 'bench', 'fountain_c', 'fountain_nw', 'fountain_se',
      'stage_back_l', 'stage_front_m', 'signpost', 'board', 'rice']) expect(TILE_NAMES, name).toContain(name)
  })

  it('uses only palette colours', () => {
    expect(lintPalette(sheet).offenders).toEqual([])
  })

  it('every ground tile is fully opaque so the map has no holes', () => {
    for (const name of ['grass', 'lawn', 'plaza', 'path', 'water', 'water2', 'shore_n', 'bridge_v', 'rice']) {
      const { col, row } = atlas.sprites[name]
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) expect(sheet.getPixel(col * 16 + x, row * 16 + y)[3], `${name} ${x},${y}`).toBe(255)
    }
  })
})
