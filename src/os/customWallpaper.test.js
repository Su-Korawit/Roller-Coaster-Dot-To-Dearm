import { describe, it, expect } from 'vitest'
import { fitSize, normalizeCrop, cropImgStyle, dragToFocus, MAX_SIDE, MAX_ZOOM } from './customWallpaper'

describe('fitSize', () => {
  it('keeps small images as they are', () => {
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 })
  })
  it('scales the long side down to MAX_SIDE, keeping the ratio', () => {
    const s = fitSize(5120, 2880)
    expect(s.width).toBe(MAX_SIDE)
    expect(s.height).toBe(1440)
  })
})

describe('normalizeCrop', () => {
  it('clamps focus to 0-100 and zoom to 1-MAX_ZOOM', () => {
    expect(normalizeCrop({ fx: -5, fy: 140, zoom: 9 })).toEqual({ fx: 0, fy: 100, zoom: MAX_ZOOM })
    expect(normalizeCrop({ fx: 50, fy: 50, zoom: 0.2 }).zoom).toBe(1)
  })
  it('falls back to centre for garbage', () => {
    expect(normalizeCrop({ fx: 'x', fy: null, zoom: undefined })).toEqual({ fx: 0, fy: 0, zoom: 1 })
  })
})

describe('cropImgStyle', () => {
  it('maps the crop to object-position and scale about the same point', () => {
    const s = cropImgStyle({ fx: 30, fy: 70, zoom: 2 })
    expect(s.objectFit).toBe('cover')
    expect(s.objectPosition).toBe('30% 70%')
    expect(s.transform).toBe('scale(2)')
    expect(s.transformOrigin).toBe('30% 70%')
  })
})

describe('dragToFocus', () => {
  const frame = { w: 200, h: 400 }
  it('dragging a wide picture right moves the focus left (the picture follows the finger)', () => {
    const next = dragToFocus({ fx: 50, fy: 50, zoom: 1 }, 20, 0, frame, 2) // 2:1 picture in a 1:2 frame
    expect(next.fx).toBeLessThan(50)
    expect(next.fy).toBe(50)           // no vertical overflow at zoom 1 → no movement
  })
  it('clamps at the edges', () => {
    const next = dragToFocus({ fx: 5, fy: 50, zoom: 1 }, 5000, 0, frame, 2)
    expect(next.fx).toBe(0)
  })
  it('gains vertical movement once zoomed in', () => {
    const next = dragToFocus({ fx: 50, fy: 50, zoom: 2 }, 0, 30, frame, 2)
    expect(next.fy).not.toBe(50)
  })
})
