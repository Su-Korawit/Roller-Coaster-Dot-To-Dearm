import { describe, it, expect } from 'vitest'
import { findPath, simplifyPath, nearestFree, createWalker } from './autoWalk'

// 0 free, 1 blocked; (x, y) index grid[y][x]
const parse = (rows) => rows.map((r) => [...r].map((c) => c === '#'))
const blockedOf = (grid) => (x, y) => y < 0 || x < 0 || y >= grid.length || x >= grid[0].length || grid[y][x]

describe('findPath', () => {
  it('walks a straight corridor', () => {
    const g = parse(['.....'])
    expect(findPath(blockedOf(g), 5, 1, { x: 0, y: 0 }, { x: 4, y: 0 })).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }])
  })

  it('goes around a wall', () => {
    const g = parse([
      '.....',
      '.###.',
      '.....',
    ])
    const path = findPath(blockedOf(g), 5, 3, { x: 0, y: 1 }, { x: 4, y: 1 })
    expect(path[0]).toEqual({ x: 0, y: 1 })
    expect(path.at(-1)).toEqual({ x: 4, y: 1 })
    expect(path.every((p) => !g[p.y][p.x])).toBe(true)
    expect(path.length).toBe(7) // up or down and over: 2 + 4 + 1 steps... shortest has 6 moves
  })

  it('returns null when the goal cannot be reached or is blocked', () => {
    const g = parse([
      '..#..',
      '..#..',
    ])
    expect(findPath(blockedOf(g), 5, 2, { x: 0, y: 0 }, { x: 4, y: 0 })).toBeNull()
    expect(findPath(blockedOf(g), 5, 2, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull()
  })

  it('the start equal to the goal is a one-tile path; a blocked start is null', () => {
    const g = parse(['.#.'])
    expect(findPath(blockedOf(g), 3, 1, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([{ x: 0, y: 0 }])
    expect(findPath(blockedOf(g), 3, 1, { x: 1, y: 0 }, { x: 2, y: 0 })).toBeNull()
  })

  it('stays inside the map', () => {
    const g = parse(['...'])
    expect(findPath(blockedOf(g), 3, 1, { x: 0, y: 0 }, { x: 9, y: 0 })).toBeNull()
  })
})

describe('nearestFree', () => {
  it('returns the tile itself when it is free, else the closest free tile', () => {
    const g = parse(['#..', '###'])
    expect(nearestFree(blockedOf(g), 3, 2, { x: 1, y: 0 })).toEqual({ x: 1, y: 0 })
    expect(nearestFree(blockedOf(g), 3, 2, { x: 0, y: 0 })).toEqual({ x: 1, y: 0 })
  })
  it('is null on a fully blocked map', () => {
    expect(nearestFree(() => true, 3, 2, { x: 0, y: 0 })).toBeNull()
  })
})

describe('simplifyPath', () => {
  it('keeps only the corners and the ends', () => {
    const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 }]
    expect(simplifyPath(path)).toEqual([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 3, y: 2 }])
  })
  it('leaves short paths alone', () => {
    expect(simplifyPath([{ x: 0, y: 0 }])).toEqual([{ x: 0, y: 0 }])
    expect(simplifyPath([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }])
    expect(simplifyPath([])).toEqual([])
  })
})

describe('createWalker', () => {
  const walker = () => createWalker([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])

  it('hands out the waypoints one by one, then finishes', () => {
    const w = walker()
    expect(w.done).toBe(false)
    expect(w.next()).toEqual({ x: 0, y: 0 })
    expect(w.next()).toEqual({ x: 10, y: 0 })
    expect(w.next()).toEqual({ x: 10, y: 10 })
    expect(w.done).toBe(true)
    expect(w.next()).toBeNull()
  })

  it('cancel stops it for good', () => {
    const w = walker()
    w.next()
    w.cancel()
    expect(w.done).toBe(true)
    expect(w.next()).toBeNull()
  })

  it('an empty path is done at once', () => {
    expect(createWalker([]).done).toBe(true)
    expect(createWalker(null).done).toBe(true)
  })
})
