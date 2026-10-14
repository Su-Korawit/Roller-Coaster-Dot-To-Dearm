import { describe, it, expect } from 'vitest'
import { recolorPixel, recolorImageData } from './recolor'

describe('recolorPixel', () => {
  it('is the identity with default options', () => {
    expect(recolorPixel(176, 123, 80)).toEqual([176, 123, 80])
  })
  it('rotating pure red by 120° gives pure green, by 240° pure blue', () => {
    expect(recolorPixel(255, 0, 0, { hue: 120 })).toEqual([0, 255, 0])
    expect(recolorPixel(255, 0, 0, { hue: 240 })).toEqual([0, 0, 255])
  })
  it('leaves greys untouched by hue changes', () => {
    expect(recolorPixel(120, 120, 120, { hue: 90 })).toEqual([120, 120, 120])
  })
  it('turns a warm brown bluish when rotated ~185°', () => {
    const [r, , b] = recolorPixel(176, 123, 80, { hue: 185 })
    expect(b).toBeGreaterThan(r)
  })
  it('lightness scales brightness', () => {
    const [r] = recolorPixel(100, 100, 100, { light: 1.5 })
    expect(r).toBeGreaterThan(100)
  })
})

describe('recolorImageData', () => {
  it('skips fully transparent pixels and recolors opaque ones', () => {
    const px = new Uint8ClampedArray([255, 0, 0, 0, 255, 0, 0, 255])
    recolorImageData(px, { hue: 120 })
    expect([...px]).toEqual([255, 0, 0, 0, 0, 255, 0, 255])
  })
})
