import { describe, it, expect } from 'vitest'
import { buildFamily } from '../build.mjs'
import { lintPalette } from '../palette.mjs'
import pets, { PET_IDS } from './pets.mjs'
import wardrobe, { ACCESSORY_IDS } from './wardrobe.mjs'
import { ROOM_CATALOG } from '../../../src/data/roomCatalogSeed.js'

const visible = (built, row, frame) => {
  const { sheet, atlas } = built
  let n = 0
  for (let y = 0; y < atlas.frameH; y++) for (let x = 0; x < atlas.frameW; x++) if (sheet.getPixel(frame * atlas.frameW + x, row * atlas.frameH + y)[3] > 0) n += 1
  return n
}

describe('pets', () => {
  const built = buildFamily(pets)
  it('has a row for every catalog pet, seven poses each, and a heart', () => {
    const catalogPets = Object.entries(ROOM_CATALOG).filter(([, i]) => i.kind === 'pet').map(([id]) => id)
    expect(PET_IDS.sort()).toEqual(catalogPets.sort())
    for (const id of PET_IDS) expect(built.atlas.sprites[id].frames, id).toBe(7)
    expect(built.atlas.sprites.heart.frames).toBe(1)
    expect([built.atlas.frameW, built.atlas.frameH]).toEqual([16, 16])
  })
  it('stays on the palette and draws every pose', () => {
    expect(lintPalette(built.sheet)).toEqual({ ok: true, offenders: [] })
    for (const id of PET_IDS) for (let f = 0; f < 7; f++) expect(visible(built, built.atlas.sprites[id].row, f), `${id}:${f}`).toBeGreaterThan(20)
  })
})

describe('wardrobe overlays', () => {
  const built = buildFamily(wardrobe)
  it('has 16 frames of 48×48 for every catalog accessory', () => {
    const catalog = Object.entries(ROOM_CATALOG).filter(([, i]) => i.kind === 'accessory').map(([id]) => id)
    expect([...ACCESSORY_IDS].sort()).toEqual(catalog.sort())
    expect([built.atlas.frameW, built.atlas.frameH]).toEqual([48, 48])
    for (const id of ACCESSORY_IDS) expect(built.atlas.sprites[id].frames, id).toBe(16)
  })
  it('stays on the palette and keeps inside the creature box (16..32) with a little room', () => {
    expect(lintPalette(built.sheet)).toEqual({ ok: true, offenders: [] })
    for (const id of ACCESSORY_IDS) {
      const row = built.atlas.sprites[id].row
      for (let f = 0; f < 16; f++) {
        for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
          if (built.sheet.getPixel(f * 48 + x, row * 48 + y)[3] > 0) {
            expect(x >= 10 && x < 38 && y >= 10 && y < 38, `${id}:${f} at ${x},${y}`).toBe(true)
          }
        }
      }
    }
  })
  it('draws something in the front view of every accessory (down frames)', () => {
    for (const id of ACCESSORY_IDS) {
      const row = built.atlas.sprites[id].row
      let n = 0
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (built.sheet.getPixel(x, row * 48 + y)[3] > 0) n += 1
      expect(n, id).toBeGreaterThan(8)
    }
  })
})
