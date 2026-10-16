import { describe, it, expect } from 'vitest'
import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildFamily, writeFamily } from './build.mjs'
import { lintPalette } from './palette.mjs'
import icons from './families/icons.mjs'

const opaqueCount = (c, x0, y0, w, h) => {
  let n = 0
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (c.getPixel(x, y)[3] === 255) n++
  return n
}

describe('buildFamily', () => {
  it('lays icons out one per row with the atlas to match', () => {
    const { sheet, atlas } = buildFamily(icons)
    expect(sheet.w).toBe(20)
    expect(sheet.h).toBe(160)
    expect(atlas.sprites.warp).toEqual({ row: 1, frames: 1 })
    expect(Object.keys(atlas.sprites)).toEqual([
      'focus', 'warp', 'plan', 'tasks', 'friends', 'shop', 'wardrobe', 'guide',
    ])
    expect(atlas.frameW).toBe(20)
    expect(atlas.name).toBe('icons')
  })

  it('places each frame of a multi-frame sprite side by side', () => {
    const fake = {
      name: 'fake', frameW: 4, frameH: 4,
      sprites: {
        blink: { frames: 2, draw: (c, f) => c.rect(0, 0, 4, 4, f === 0 ? '#5c4e92' : '#FFFFFF') },
      },
    }
    const { sheet, atlas } = buildFamily(fake)
    expect(sheet.w).toBe(8)
    expect(atlas.sprites.blink).toEqual({ row: 0, frames: 2 })
    expect(sheet.getPixel(0, 0).slice(0, 3)).toEqual([0x5c, 0x4e, 0x92])
    expect(sheet.getPixel(4, 0).slice(0, 3)).toEqual([255, 255, 255])
  })

  it('keeps every icon on the soft pixel palette', () => {
    expect(lintPalette(buildFamily(icons).sheet).ok).toBe(true)
  })

  it('draws something in every icon (no blank sprites)', () => {
    const { sheet, atlas } = buildFamily(icons)
    for (const [key, { row }] of Object.entries(atlas.sprites)) {
      expect(opaqueCount(sheet, 0, row * 20, 20, 20), key).toBeGreaterThanOrEqual(40)
    }
  })
})

describe('writeFamily', () => {
  it('writes sheet, atlas and a contact sheet', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'art-'))
    await writeFamily(icons, { outDir: join(dir, 'out'), reviewDir: join(dir, 'review') })
    expect(existsSync(join(dir, 'out', 'icons.png'))).toBe(true)
    expect(existsSync(join(dir, 'review', 'icons.png'))).toBe(true)
    const atlas = JSON.parse(readFileSync(join(dir, 'out', 'icons.json'), 'utf8'))
    expect(atlas.sprites.guide.row).toBe(7)
  })

  it('refuses to write when the palette lint fails', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'art-'))
    const bad = {
      name: 'bad', frameW: 2, frameH: 2,
      sprites: { x: { frames: 1, draw: (c) => c.px(0, 0, '#123456') } },
    }
    await expect(writeFamily(bad, { outDir: join(dir, 'out'), reviewDir: join(dir, 'review') }))
      .rejects.toThrow(/Palette lint failed for bad: #123456/)
    expect(existsSync(join(dir, 'out', 'bad.png'))).toBe(false)
  })
})
