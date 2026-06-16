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
})
