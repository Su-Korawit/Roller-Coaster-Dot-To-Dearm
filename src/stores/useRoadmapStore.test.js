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
})
