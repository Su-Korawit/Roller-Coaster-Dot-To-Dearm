import { describe, it, expect } from 'vitest'
import { findProximityConnection } from './findProximityConnection'

// Two 160x80 process blocks. Dragged 'a' right-source handle sits at (460,140);
// 'b' at (470,100) has its left-target handle at (470,140) — 10px away.
const dragged = { id: 'a', type: 'process', position: { x: 300, y: 100 } }

describe('findProximityConnection', () => {
  it('connects a dragged source dot to a nearby target dot and aligns the dragged block', () => {
    const other = { id: 'b', type: 'process', position: { x: 470, y: 100 } }
    expect(findProximityConnection(dragged, [other], 40)).toEqual({
      connection: { source: 'a', target: 'b', sourceHandle: null },
      position: { x: 310, y: 100 },
    })
  })

  it('returns null when no dots are within threshold', () => {
    const far = { id: 'b', type: 'process', position: { x: 700, y: 500 } }
    expect(findProximityConnection(dragged, [far], 40)).toBeNull()
  })

  it('connects to a condition bottom-source dot, with the condition as the edge source', () => {
    // condition 112x112 at (200,200): bottom-source dot at (256,312).
    const condition = { id: 'c', type: 'condition', position: { x: 200, y: 200 } }
    // dragged process at (260,280): left-target dot at (260,320) — ~9px away.
    const draggedP = { id: 'a', type: 'process', position: { x: 260, y: 280 } }
    expect(findProximityConnection(draggedP, [condition], 40)).toEqual({
      connection: { source: 'c', target: 'a', sourceHandle: 'bottom' },
      position: { x: 256, y: 272 },
    })
  })

  it('picks the nearest target when several are within threshold', () => {
    // dragged 'a' right-source at (460,140).
    const near = { id: 'c', type: 'process', position: { x: 468, y: 100 } } // left-target (468,140), 8px
    const farther = { id: 'b', type: 'process', position: { x: 475, y: 100 } } // left-target (475,140), 15px
    const result = findProximityConnection(dragged, [farther, near], 40)
    expect(result.connection).toEqual({ source: 'a', target: 'c', sourceHandle: null })
    expect(result.position).toEqual({ x: 308, y: 100 })
  })

  it('does not connect two same-role dots (source-to-source)', () => {
    // 'b' overlaps 'a': their source dots coincide, but only opposite roles may pair.
    const overlapping = { id: 'b', type: 'process', position: { x: 300, y: 100 } }
    expect(findProximityConnection(dragged, [overlapping], 40)).toBeNull()
  })
})
