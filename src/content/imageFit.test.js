import { describe, it, expect } from 'vitest'
import { fitWithin } from './imageFit'

describe('fitWithin', () => {
  it('scales a wide image down to the max, keeping the ratio', () => {
    expect(fitWithin(3200, 1600)).toEqual({ width: 1600, height: 800 })
  })

  it('scales a tall image by its longest side', () => {
    expect(fitWithin(1000, 4000)).toEqual({ width: 400, height: 1600 })
  })

  it('never upscales', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('returns whole pixels', () => {
    const { width, height } = fitWithin(3001, 1999)
    expect(Number.isInteger(width) && Number.isInteger(height)).toBe(true)
    expect(Math.max(width, height)).toBe(1600)
  })

  it('honours a custom max', () => {
    expect(fitWithin(2000, 1000, 500)).toEqual({ width: 500, height: 250 })
  })

  it('never returns a zero side', () => {
    expect(fitWithin(10000, 1)).toEqual({ width: 1600, height: 1 })
  })
})
