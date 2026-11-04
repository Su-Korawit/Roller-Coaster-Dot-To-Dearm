import { describe, it, expect } from 'vitest'
import { isWalkableAt } from './walkable'

// A 3x2 map of 16 px tiles; the layer blocks tile (1, 0).
const layer = (blocked) => ({ getTileAt: (x, y) => (blocked.some(([bx, by]) => bx === x && by === y) ? { collides: true } : (x === 2 && y === 1 ? { collides: false } : null)) })
const map = { width: 3, height: 2, tileWidth: 16, tileHeight: 16 }

describe('isWalkableAt', () => {
  const layers = [layer([[1, 0]])]
  it('is true on open floor and on a tile whose collision was switched off', () => {
    expect(isWalkableAt(map, layers, 8, 8)).toBe(true)
    expect(isWalkableAt(map, layers, 40, 24)).toBe(true)
  })
  it('is false on a colliding tile', () => {
    expect(isWalkableAt(map, layers, 20, 4)).toBe(false)
  })
  it('is false outside the map and for non-finite input', () => {
    expect(isWalkableAt(map, layers, -1, 4)).toBe(false)
    expect(isWalkableAt(map, layers, 48, 4)).toBe(false)
    expect(isWalkableAt(map, layers, 4, 32)).toBe(false)
    expect(isWalkableAt(map, layers, NaN, 4)).toBe(false)
  })
  it('is false when the map is not loaded', () => {
    expect(isWalkableAt(null, layers, 8, 8)).toBe(false)
  })
})
