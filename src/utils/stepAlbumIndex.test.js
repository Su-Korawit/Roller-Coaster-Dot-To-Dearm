import { describe, it, expect } from 'vitest'
import { stepAlbumIndex } from './stepAlbumIndex'

describe('stepAlbumIndex', () => {
  it('steps forward within bounds', () => {
    expect(stepAlbumIndex(0, 1, 3)).toBe(1)
  })

  it('wraps forward past the end back to 0', () => {
    expect(stepAlbumIndex(2, 1, 3)).toBe(0)
  })

  it('wraps backward past the start to the last index', () => {
    expect(stepAlbumIndex(0, -1, 3)).toBe(2)
  })

  it('always resolves to 0 for a single-item album', () => {
    expect(stepAlbumIndex(0, 1, 1)).toBe(0)
    expect(stepAlbumIndex(0, -1, 1)).toBe(0)
  })

  it('resolves to 0 for an empty album instead of dividing by zero', () => {
    expect(stepAlbumIndex(0, 1, 0)).toBe(0)
  })
})
