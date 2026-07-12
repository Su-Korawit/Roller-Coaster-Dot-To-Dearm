import { describe, it, expect } from 'vitest'
import { findProximityConnection } from './findProximityConnection'

// Two 128x128 process blocks. Dragged 'a' right-source handle sits at (428,164);
// 'b' at (438,100) has its left-target handle at (438,164) — 10px away.
const dragged = { id: 'a', type: 'process', position: { x: 300, y: 100 } }

describe('findProximityConnection', () => {
  it('connects a dragged source dot to a nearby target dot and aligns the dragged block', () => {
    const other = { id: 'b', type: 'process', position: { x: 438, y: 100 } }
    expect(findProximityConnection(dragged, [other], 40)).toEqual({
      connection: { source: 'a', target: 'b', sourceHandle: null, targetHandle: null },
      position: { x: 310, y: 100 },
    })
  })

  it('returns null when no dots are within threshold', () => {
    const far = { id: 'b', type: 'process', position: { x: 700, y: 500 } }
    expect(findProximityConnection(dragged, [far], 40)).toBeNull()
  })

  it('connects to a condition bottom-source dot, with the condition as the edge source', () => {
    // condition 128x128 at (200,200): bottom-source dot at (264,328).
    const condition = { id: 'c', type: 'condition', position: { x: 200, y: 200 } }
    // dragged process at (264,256): left-target dot at (264,320) — 8px away.
    const draggedP = { id: 'a', type: 'process', position: { x: 264, y: 256 } }
    expect(findProximityConnection(draggedP, [condition], 40)).toEqual({
      connection: { source: 'c', target: 'a', sourceHandle: 'bottom', targetHandle: null },
      position: { x: 264, y: 264 },
    })
  })

  it('picks the nearest target when several are within threshold', () => {
    // dragged 'a' right-source at (428,164).
    const near = { id: 'c', type: 'process', position: { x: 436, y: 100 } } // left-target (436,164), 8px
    const farther = { id: 'b', type: 'process', position: { x: 443, y: 100 } } // left-target (443,164), 15px
    const result = findProximityConnection(dragged, [farther, near], 40)
    expect(result.connection).toEqual({ source: 'a', target: 'c', sourceHandle: null, targetHandle: null })
    expect(result.position).toEqual({ x: 308, y: 100 })
  })

  it('snaps two image blocks together — dots are plain points with no in/out', () => {
    // image 128x128 'a' at (300,100): right dot at (428,164).
    // image 'b' at (438,100): left dot at (438,164) — 10px away.
    const a = { id: 'a', type: 'image', position: { x: 300, y: 100 } }
    const b = { id: 'b', type: 'image', position: { x: 438, y: 100 } }
    expect(findProximityConnection(a, [b], 40)).toEqual({
      connection: { source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' },
      position: { x: 310, y: 100 },
    })
  })

  it('connects a dragged process bottom-source dot to a block below it', () => {
    // dragged 'a' process at (300,100): bottom-source dot at (364,228).
    // 'b' process at (364,174): left-target dot at (364,238) — 10px below.
    const below = { id: 'b', type: 'process', position: { x: 364, y: 174 } }
    expect(findProximityConnection(dragged, [below], 40)).toEqual({
      connection: { source: 'a', target: 'b', sourceHandle: 'bottom', targetHandle: null },
      position: { x: 300, y: 110 },
    })
  })

  it('connects two same-role dots — there is no in/out restriction', () => {
    // 'b' overlaps 'a': their left dots coincide (distance 0) and now connect,
    // where before same-role (target-to-target) pairs were skipped.
    const overlapping = { id: 'b', type: 'process', position: { x: 300, y: 100 } }
    expect(findProximityConnection(dragged, [overlapping], 40)).toEqual({
      connection: { source: 'a', target: 'b', sourceHandle: null, targetHandle: null },
      position: { x: 300, y: 100 },
    })
  })

  it('snaps a dragged update block onto an ideaRoot right dot', () => {
    // ideaRoot 128×128 at (100,100): right-source dot at (228,164).
    // dragged update at (238,100): left-target dot at (238,164) — 10px away.
    const root = { id: 'root', type: 'ideaRoot', position: { x: 100, y: 100 } }
    const upd = { id: 'upd', type: 'update', position: { x: 238, y: 100 } }
    expect(findProximityConnection(upd, [root], 40)).toEqual({
      connection: { source: 'root', target: 'upd', sourceHandle: null, targetHandle: null },
      position: { x: 228, y: 100 },
    })
  })

  it('snaps a dragged success top dot onto an update bottom dot', () => {
    // update 128×128 at (100,100): bottom-source dot at (164,228).
    // dragged success at (100,220): top-source dot at (164,220) — 8px away.
    const upd = { id: 'upd', type: 'update', position: { x: 100, y: 100 } }
    const succ = { id: 'succ', type: 'success', position: { x: 100, y: 220 } }
    expect(findProximityConnection(succ, [upd], 40)).toEqual({
      connection: { source: 'succ', target: 'upd', sourceHandle: 'top', targetHandle: 'bottom' },
      position: { x: 100, y: 228 },
    })
  })
})
