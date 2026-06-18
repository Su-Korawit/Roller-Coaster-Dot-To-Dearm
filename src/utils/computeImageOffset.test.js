import { describe, it, expect } from 'vitest'
import { computeImageOffset } from './computeImageOffset'

describe('computeImageOffset', () => {
  it('shifts the offset proportionally to the drag delta and block size', () => {
    // Dragging the image right by 20px over a 128px-wide block reveals more of
    // its left side: object-position x decreases by (20/128)*100 ≈ 15.625.
    // Here dx is negative (drag left) so x increases.
    expect(
      computeImageOffset({ x: 50, y: 50 }, { dx: -20, dy: 0 }, { w: 128, h: 128 }),
    ).toEqual({ x: 65.625, y: 50 })
  })

  it('clamps at the upper bound so the image cannot be panned past its edge', () => {
    // x would reach 90 + 50 = 140; clamped to 100.
    expect(
      computeImageOffset({ x: 90, y: 50 }, { dx: -64, dy: 0 }, { w: 128, h: 128 }),
    ).toEqual({ x: 100, y: 50 })
  })

  it('clamps at the lower bound', () => {
    // x would reach 10 - 50 = -40; clamped to 0.
    expect(
      computeImageOffset({ x: 10, y: 50 }, { dx: 64, dy: 0 }, { w: 128, h: 128 }),
    ).toEqual({ x: 0, y: 50 })
  })

  it('shifts the vertical offset independently of the horizontal', () => {
    // y: 50 + (32/128)*100 = 75; x unchanged.
    expect(
      computeImageOffset({ x: 50, y: 50 }, { dx: 0, dy: -32 }, { w: 128, h: 128 }),
    ).toEqual({ x: 50, y: 75 })
  })
})
