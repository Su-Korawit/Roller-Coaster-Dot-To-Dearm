import { describe, it, expect } from 'vitest'
import { normalizeImageNodeData, DEFAULT_IMAGE_OFFSET } from './normalizeImageNodeData'

describe('normalizeImageNodeData', () => {
  it('returns an empty album for undefined data', () => {
    expect(normalizeImageNodeData(undefined)).toEqual({ images: [], activeIndex: 0 })
  })

  it('returns an empty album for an empty object', () => {
    expect(normalizeImageNodeData({})).toEqual({ images: [], activeIndex: 0 })
  })

  it('migrates the legacy { url, offset } shape into a single-image album', () => {
    expect(normalizeImageNodeData({ url: 'a.png', offset: { x: 10, y: 20 } })).toEqual({
      images: [{ url: 'a.png', offset: { x: 10, y: 20 } }],
      activeIndex: 0,
    })
  })

  it('defaults the offset when migrating a legacy shape without one', () => {
    expect(normalizeImageNodeData({ url: 'a.png' })).toEqual({
      images: [{ url: 'a.png', offset: DEFAULT_IMAGE_OFFSET }],
      activeIndex: 0,
    })
  })

  it('passes an already-normalized shape through unchanged', () => {
    const data = { images: [{ url: 'a.png' }, { url: 'b.png' }], activeIndex: 1 }
    expect(normalizeImageNodeData(data)).toEqual(data)
  })

  it('clamps an out-of-range activeIndex to the last image', () => {
    expect(normalizeImageNodeData({ images: [{ url: 'a.png' }], activeIndex: 5 })).toEqual({
      images: [{ url: 'a.png' }],
      activeIndex: 0,
    })
  })

  it('clamps activeIndex to 0 for an empty images array', () => {
    expect(normalizeImageNodeData({ images: [], activeIndex: 3 })).toEqual({ images: [], activeIndex: 0 })
  })
})
