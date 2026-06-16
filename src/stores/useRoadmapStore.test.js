import { describe, it, expect, beforeEach, vi } from 'vitest'

// Zustand persist writes to localStorage; stub it so tests stay isolated
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

const { useRoadmapStore } = await import('./useRoadmapStore')

describe('useRoadmapStore', () => {
  beforeEach(() => {
    useRoadmapStore.setState({ nodes: [], edges: [] })
  })

  it('initializes with empty nodes and edges', () => {
    const { nodes, edges } = useRoadmapStore.getState()
    expect(nodes).toEqual([])
    expect(edges).toEqual([])
  })

  it('setNodes replaces the nodes array', () => {
    const newNodes = [{ id: '1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Step 1' } }]
    useRoadmapStore.getState().setNodes(newNodes)
    expect(useRoadmapStore.getState().nodes).toEqual(newNodes)
  })

  it('setEdges replaces the edges array', () => {
    const newEdges = [{ id: 'e1-2', source: '1', target: '2' }]
    useRoadmapStore.getState().setEdges(newEdges)
    expect(useRoadmapStore.getState().edges).toEqual(newEdges)
  })

  it('addNode creates a node of the given type', () => {
    useRoadmapStore.getState().addNode('process')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe('process')
  })

  it('addNode assigns a unique id to each node', () => {
    useRoadmapStore.getState().addNode('process')
    useRoadmapStore.getState().addNode('process')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes).toHaveLength(2)
    expect(nodes[0].id).not.toBe(nodes[1].id)
  })

  it('updateNodeData patches data on the correct node', () => {
    useRoadmapStore.getState().addNode('process')
    const id = useRoadmapStore.getState().nodes[0].id
    useRoadmapStore.getState().updateNodeData(id, { label: 'My Step' })
    const node = useRoadmapStore.getState().nodes.find((n) => n.id === id)
    expect(node.data.label).toBe('My Step')
  })

  it('removeNode removes the node from the board', () => {
    useRoadmapStore.getState().addNode('process')
    const id = useRoadmapStore.getState().nodes[0].id
    useRoadmapStore.getState().removeNode(id)
    expect(useRoadmapStore.getState().nodes).toHaveLength(0)
  })

  it('connect adds an edge between two blocks', () => {
    useRoadmapStore.getState().connect({ source: 'a', target: 'b' })
    const { edges } = useRoadmapStore.getState()
    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe('a')
    expect(edges[0].target).toBe('b')
  })

  it('removeEdge removes the connection from the board', () => {
    useRoadmapStore.getState().connect({ source: 'a', target: 'b' })
    const id = useRoadmapStore.getState().edges[0].id
    useRoadmapStore.getState().removeEdge(id)
    expect(useRoadmapStore.getState().edges).toHaveLength(0)
  })

  it('addNode creates a condition-typed node', () => {
    useRoadmapStore.getState().addNode('condition')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes[0].type).toBe('condition')
  })

  it('a Condition block can fork — hold two or more outgoing edges from the same source', () => {
    useRoadmapStore.getState().connect({ source: 'cond-1', target: 'a' })
    useRoadmapStore.getState().connect({ source: 'cond-1', target: 'b' })
    const outgoing = useRoadmapStore.getState().edges.filter((e) => e.source === 'cond-1')
    expect(outgoing).toHaveLength(2)
  })

  it('addNode creates a stageLabel-typed node', () => {
    useRoadmapStore.getState().addNode('stageLabel')
    const { nodes } = useRoadmapStore.getState()
    expect(nodes[0].type).toBe('stageLabel')
  })
})
