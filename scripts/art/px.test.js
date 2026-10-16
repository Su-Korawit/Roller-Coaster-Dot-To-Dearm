import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { Canvas } from './px.mjs'

const OPAQUE = (c, x, y) => c.getPixel(x, y)[3] === 255
const CLEAR = (c, x, y) => c.getPixel(x, y)[3] === 0

describe('Canvas', () => {
  it('draws a symmetric ellipse', () => {
    const c = new Canvas(11, 11)
    c.ellipse(5, 5, 3, 2, '#5c4e92')
    expect(OPAQUE(c, 5, 5)).toBe(true)
    expect(OPAQUE(c, 8, 5)).toBe(true)
    expect(CLEAR(c, 9, 5)).toBe(true)
    expect(CLEAR(c, 5, 8)).toBe(true)
    for (let dx = 0; dx <= 3; dx++) {
      expect(c.getPixel(5 - dx, 5)).toEqual(c.getPixel(5 + dx, 5))
    }
  })

  it('rounds the corners of a rounded rect', () => {
    const c = new Canvas(10, 6)
    c.rrect(0, 0, 10, 6, 2, '#5c4e92')
    expect(CLEAR(c, 0, 0)).toBe(true)
    expect(OPAQUE(c, 2, 0)).toBe(true)
    expect(OPAQUE(c, 0, 2)).toBe(true)
    expect(CLEAR(c, 9, 5)).toBe(true)
  })

  it('blends translucent pixels over what is underneath', () => {
    const c = new Canvas(1, 1)
    c.px(0, 0, '#FFFFFF')
    c.px(0, 0, [0x5c, 0x4e, 0x92, 128])
    const [r] = c.getPixel(0, 0)
    expect(r).toBeLessThan(255)
    expect(r).toBeGreaterThan(0x5c)
  })

  it('ignores out-of-bounds writes', () => {
    const c = new Canvas(2, 2)
    expect(() => c.px(-1, 5, '#FFFFFF')).not.toThrow()
    expect(c.getPixel(0, 0)[3]).toBe(0)
  })

  it('encodes a PNG scaled by an integer factor', async () => {
    const c = new Canvas(3, 2)
    c.rect(0, 0, 3, 2, '#5c4e92')
    const meta = await sharp(await c.toPng(4)).metadata()
    expect(meta.width).toBe(12)
    expect(meta.height).toBe(8)
  })

  it('keeps hard pixel edges when scaled (nearest neighbour)', async () => {
    const c = new Canvas(2, 1)
    c.px(0, 0, '#000001')
    c.px(1, 0, '#FFFFFE')
    const { data, info } = await sharp(await c.toPng(4)).raw().toBuffer({ resolveWithObject: true })
    const at = (x) => data[x * info.channels]
    expect(at(3)).toBe(0)
    expect(at(4)).toBe(255)
  })
})
