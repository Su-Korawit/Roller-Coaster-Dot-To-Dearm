import { describe, it, expect } from 'vitest'
import { Canvas } from './px.mjs'
import { lintPalette, SOFT_PIXEL_PALETTE } from './palette.mjs'
import { readIndexCss, readThemeTokens } from '../../src/theme/readTheme.js'

describe('lintPalette', () => {
  it('accepts in-palette opaque pixels and transparency', () => {
    const c = new Canvas(3, 1)
    c.px(0, 0, '#5c4e92')
    c.px(1, 0, '#FFFFFF')
    expect(lintPalette(c)).toEqual({ ok: true, offenders: [] })
  })

  it('reports off-palette colours with counts', () => {
    const c = new Canvas(2, 1)
    c.px(0, 0, '#123456')
    expect(lintPalette(c)).toEqual({ ok: false, offenders: [{ hex: '#123456', count: 1 }] })
  })

  it('allows translucent pixels by default and rejects them on request', () => {
    const c = new Canvas(1, 1)
    c.px(0, 0, [92, 78, 146, 128])
    expect(lintPalette(c).ok).toBe(true)
    const strict = lintPalette(c, SOFT_PIXEL_PALETTE, { allowTranslucent: false })
    expect(strict.ok).toBe(false)
    expect(strict.offenders[0].count).toBe(1)
  })

  it('matches hex case-insensitively', () => {
    const c = new Canvas(1, 1)
    c.px(0, 0, '#5C4E92')
    expect(lintPalette(c, ['#5c4e92']).ok).toBe(true)
  })
})

describe('SOFT_PIXEL_PALETTE', () => {
  it('contains every opaque token colour from the theme', () => {
    const tokens = readThemeTokens(readIndexCss())
    const palette = new Set(SOFT_PIXEL_PALETTE.map((h) => h.toUpperCase()))
    const colours = Object.entries(tokens)
      .filter(([k, v]) => k.startsWith('color-') && /^#[0-9a-f]{6}$/i.test(v))
      .map(([, v]) => v.toUpperCase())
    expect(colours.length).toBeGreaterThan(30)
    for (const hex of colours) expect(palette.has(hex), hex).toBe(true)
  })

  it('has no pure black and no duplicates', () => {
    const upper = SOFT_PIXEL_PALETTE.map((h) => h.toUpperCase())
    expect(upper).not.toContain('#000000')
    expect(new Set(upper).size).toBe(upper.length)
  })
})
