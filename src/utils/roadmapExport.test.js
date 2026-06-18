import { describe, it, expect } from 'vitest'
import { toSchema, fromSchema } from './roadmapExport'

const NODES = [
  { id: 'a', type: 'process', position: { x: 10, y: 20 }, data: { label: 'A', note: '' } },
  { id: 'b', type: 'stageLabel', position: { x: 0, y: 0 }, data: { label: 'Stage' }, width: 200, height: 40 },
]
const EDGES = [
  { id: 'e1', source: 'a', target: 'b', sourceHandle: null, targetHandle: null },
]

describe('toSchema', () => {
  it('produces a version-1 envelope', () => {
    expect(toSchema(NODES, EDGES).version).toBe(1)
  })

  it('maps a node id, type, position and data', () => {
    const node = toSchema(NODES, EDGES).nodes[0]
    expect(node).toMatchObject({ id: 'a', type: 'process', position: { x: 10, y: 20 }, data: { label: 'A', note: '' } })
  })

  it('emits width/height only for nodes that carry them', () => {
    const { nodes } = toSchema(NODES, EDGES)
    expect(nodes[0].width).toBeUndefined()
    expect(nodes[1].width).toBe(200)
    expect(nodes[1].height).toBe(40)
  })

  it('includes edges with their handles', () => {
    expect(toSchema(NODES, EDGES).edges[0]).toMatchObject({ id: 'e1', source: 'a', target: 'b' })
  })
})

describe('fromSchema', () => {
  it('round-trips nodes and edges through a JSON serialisation', () => {
    const roundTripped = fromSchema(JSON.parse(JSON.stringify(toSchema(NODES, EDGES))))
    expect(roundTripped.nodes).toEqual(NODES)
    expect(roundTripped.edges).toEqual(EDGES)
  })

  it('rejects a schema with an unknown version', () => {
    expect(() => fromSchema({ version: 2, nodes: [], edges: [] })).toThrow()
  })

  it('rejects a schema with a missing version', () => {
    expect(() => fromSchema({ nodes: [], edges: [] })).toThrow()
  })
})
