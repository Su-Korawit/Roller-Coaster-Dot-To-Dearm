import { describe, it, expect } from 'vitest'
import { hexToRgb, relativeLuminance, contrastRatio } from './contrast'

describe('contrast', () => {
  it('rates black on white at 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
  })

  it('is order-independent and accepts short hex', () => {
    expect(contrastRatio('#FFFFFF', '#000')).toBe(contrastRatio('#000', '#FFFFFF'))
  })

  it('rates the Soft Pixel ink on white at about 14.16', () => {
    expect(contrastRatio('#2B2550', '#FFFFFF')).toBeCloseTo(14.16, 1)
  })

  it('flags the spec danger red as failing AA text contrast', () => {
    expect(contrastRatio('#D9534F', '#FFFFFF')).toBeLessThan(4.5)
  })

  it('parses hex to rgb', () => {
    expect(hexToRgb('#5c4e92')).toEqual([92, 78, 146])
  })

  it('throws on invalid hex', () => {
    expect(() => hexToRgb('nope')).toThrow('Invalid hex: nope')
  })

  it('puts white at luminance 1', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
  })
})
