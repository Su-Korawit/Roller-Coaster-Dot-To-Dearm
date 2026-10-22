import { describe, it, expect } from 'vitest'
import { findPath, simplifyPath, nearestFree, createWalker, createWalkState, waypointTarget, stuckAction, bodyBlocked } from './autoWalk'

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

describe('createWalkState (review: a map switch mid-walk must not leave a dangling walk)', () => {
  it('stop() on a state that never started is safe and leaves it inactive', () => {
    const w = createWalkState()
    expect(() => w.stop()).not.toThrow()
    expect(w.active).toBe(false)
    expect(w.next()).toBeNull()
  })

  it('start hands out waypoints; the walk stays active until stopped (the last waypoint is still being walked to)', () => {
    const w = createWalkState()
    expect(w.start([{ x: 1, y: 1 }, { x: 5, y: 1 }])).toBe(true)
    expect(w.next()).toEqual({ x: 1, y: 1 })
    expect(w.next()).toEqual({ x: 5, y: 1 })
    expect(w.next()).toBeNull()
    expect(w.active).toBe(true)
    w.stop()
    expect(w.active).toBe(false)
  })

  it('stop() ends a walk for good: nothing more is handed out and a second stop is harmless', () => {
    const w = createWalkState()
    w.start([{ x: 1, y: 1 }, { x: 5, y: 1 }])
    w.stop()
    expect(w.next()).toBeNull()
    expect(() => w.stop()).not.toThrow()
  })

  it('an empty path does not start a walk', () => {
    const w = createWalkState()
    expect(w.start([])).toBe(false)
    expect(w.active).toBe(false)
  })
})

describe('waypointTarget (review: aim so the 20 px body fills one tile row)', () => {
  it('centres horizontally on the tile and puts the body (-12..+8 around the sprite) on the tile row', () => {
    expect(waypointTarget({ x: 3, y: 5 }, 1)).toEqual({ x: 56, y: 92 })
    expect(waypointTarget({ x: 3, y: 5 }, 2)).toEqual({ x: 112, y: 184 })
  })
})

describe('stuckAction (review: a stalled auto-walk must end, not walk in place forever)', () => {
  it('does nothing while moving or only briefly held up', () => {
    expect(stuckAction({ stuckFrames: 0, distance: 100 })).toBe('none')
    expect(stuckAction({ stuckFrames: 12, distance: 100 })).toBe('none')
  })
  it('close to the waypoint, a short stall counts as arrival (a door strip under a wall)', () => {
    expect(stuckAction({ stuckFrames: 13, distance: 10 })).toBe('advance')
  })
  it('far from the waypoint, a longer stall cancels the walk', () => {
    expect(stuckAction({ stuckFrames: 13, distance: 100 })).toBe('none')
    expect(stuckAction({ stuckFrames: 31, distance: 100 })).toBe('cancel')
  })
})

describe('bodyBlocked (review: the 20 px body reaches 4 px into the row below its tile)', () => {
  it('a tile is unusable when the tile below it is blocked', () => {
    const g = parse(['...', '.#.', '...'])
    const blocked = bodyBlocked(blockedOf(g))
    expect(blocked(0, 0)).toBe(false)
    expect(blocked(1, 0)).toBe(true) // free itself, but its body would clip the wall below
    expect(blocked(1, 1)).toBe(true)
    expect(blocked(2, 1)).toBe(false)
    expect(blocked(1, 2)).toBe(true) // the last row: below it is the map edge, which counts as blocked
  })

  it('paths found with it keep one clear row between the walker and a wall below', () => {
    const g = parse([
      '.....',
      '.###.',
      '.....',
      '.....',
    ])
    const path = findPath(bodyBlocked(blockedOf(g)), 5, 4, { x: 0, y: 0 }, { x: 4, y: 0 })
    expect(path.at(-1)).toEqual({ x: 4, y: 0 })
    // row 0 is straight above the wall, so the walker goes round it instead of brushing along the top
    expect(path.some((t) => t.y === 0 && t.x >= 1 && t.x <= 3)).toBe(false)
  })
})
