import { describe, it, expect } from 'vitest'
import { removeAlbumImage } from './removeAlbumImage'

const a = { url: 'a.png' }
const b = { url: 'b.png' }
const c = { url: 'c.png' }

describe('removeAlbumImage', () => {
  it('removing an image before the active one shifts activeIndex down to keep the same image showing', () => {
    expect(removeAlbumImage([a, b, c], 2, 0)).toEqual({ images: [b, c], activeIndex: 1 })
  })

  it('removing the active image slides the next image into its place', () => {
    expect(removeAlbumImage([a, b, c], 0, 0)).toEqual({ images: [b, c], activeIndex: 0 })
  })

  it('removing the active image when it is last clamps to the new last index', () => {
    expect(removeAlbumImage([a, b, c], 2, 2)).toEqual({ images: [a, b], activeIndex: 1 })
  })

  it('removing an image after the active one leaves activeIndex unchanged', () => {
    expect(removeAlbumImage([a, b, c], 0, 2)).toEqual({ images: [a, b], activeIndex: 0 })
  })

  it('removing the only image returns an empty album', () => {
    expect(removeAlbumImage([a], 0, 0)).toEqual({ images: [], activeIndex: 0 })
  })
})
