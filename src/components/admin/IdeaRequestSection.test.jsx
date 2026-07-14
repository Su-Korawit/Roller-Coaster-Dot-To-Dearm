// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, screen } from '@testing-library/react'
import { forwardRef } from 'react'

let captured = null
vi.mock('@xyflow/react', () => ({
  ReactFlow: (props) => {
    captured = props
    return null
  },
  ReactFlowProvider: ({ children }) => children,
  Background: () => null,
  Controls: () => null,
  applyNodeChanges: (_changes, nodes) => nodes,
  applyEdgeChanges: (_changes, edges) => edges,
  addEdge: (connection, edges) => [...edges, { id: 'new-edge', ...connection }],
}))
vi.mock('../../services/irBoardSession', () => ({
  mountIrBoard: vi.fn().mockResolvedValue('token-1'),
  unmountIrBoard: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../roadmap/nodeTypes', () => ({ nodeTypes: {} }))
vi.mock('../roadmap/TrashZone', () => ({
  default: forwardRef(function TrashZoneStub({ visible }, ref) {
    if (!visible) return null
    return <div ref={ref} data-testid="trash-zone" aria-label="Trash zone — drop block here to delete" />
  }),
}))
vi.mock('../roadmap/RoadmapToolbar', () => ({
  default: () => <div data-testid="roadmap-toolbar" />,
  IR_PALETTE_ITEMS: [],
}))

// Two 128×128 process blocks 10px apart: a's right dot (428,164) is within
// the 40px threshold of b's left dot (438,164).
const storeState = {
  nodes: [
    { id: 'a', type: 'process', position: { x: 300, y: 100 } },
    { id: 'b', type: 'process', position: { x: 438, y: 100 } },
  ],
  edges: [],
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  addNode: vi.fn(),
  connect: vi.fn(),
  detachNode: vi.fn(),
  removeNode: vi.fn(),
  removeEdge: vi.fn(),
  selection: [],
  setSelection: vi.fn(),
  clearSelection: vi.fn(),
  removeSelection: vi.fn(),
  duplicateSelection: vi.fn(),
  syncStatus: 'idle',
}
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (selector) => selector(storeState),
}))

const { default: IdeaRequestSection } = await import('./IdeaRequestSection')
const { default: InvisibleEdge } = await import('../roadmap/InvisibleEdge')

describe('IdeaRequestSection snap connections', () => {
  beforeEach(() => {
    captured = null
    storeState.setNodes.mockClear()
    storeState.setEdges.mockClear()
    storeState.detachNode.mockClear()
    storeState.removeNode.mockClear()
    storeState.removeEdge.mockClear()
  })

  it('hides edge lines by registering InvisibleEdge as the default edge type', async () => {
    render(<IdeaRequestSection />)
    await waitFor(() => expect(captured).not.toBeNull())
    expect(captured.edgeTypes.default).toBe(InvisibleEdge)
  })

  it('detaches a block from its connections when a drag starts', async () => {
    render(<IdeaRequestSection />)
    await waitFor(() => expect(captured).not.toBeNull())
    captured.onNodeDragStart({}, { id: 'a' })
    expect(storeState.detachNode).toHaveBeenCalledWith('a')
  })

  it('snaps the dropped block dot-to-dot and adds the edge', async () => {
    render(<IdeaRequestSection />)
    await waitFor(() => expect(captured).not.toBeNull())
    captured.onNodeDragStop({}, storeState.nodes[0])
    expect(storeState.setNodes).toHaveBeenCalledWith([
      { id: 'a', type: 'process', position: { x: 310, y: 100 } },
      { id: 'b', type: 'process', position: { x: 438, y: 100 } },
    ])
    expect(storeState.setEdges).toHaveBeenCalledWith([
      { id: 'new-edge', source: 'a', target: 'b', sourceHandle: null, targetHandle: null },
    ])
  })

  it('leaves nodes and edges alone when the drop is nowhere near a dot', async () => {
    render(<IdeaRequestSection />)
    await waitFor(() => expect(captured).not.toBeNull())
    captured.onNodeDragStop({}, { id: 'a', type: 'process', position: { x: 900, y: 900 } })
    expect(storeState.setNodes).not.toHaveBeenCalled()
    expect(storeState.setEdges).not.toHaveBeenCalled()
  })

  it('wires Delete/Backspace to remove selected blocks and their edges', async () => {
    render(<IdeaRequestSection />)
    await waitFor(() => expect(captured).not.toBeNull())
    expect(captured.deleteKeyCode).toEqual(['Backspace', 'Delete'])
    captured.onNodesDelete([{ id: 'a' }])
    expect(storeState.removeNode).toHaveBeenCalledWith('a')
    captured.onEdgesDelete([{ id: 'e1' }])
    expect(storeState.removeEdge).toHaveBeenCalledWith('e1')
  })

  it('deletes a block dropped on the trash zone instead of snapping it', async () => {
    render(<IdeaRequestSection />)
    await waitFor(() => expect(captured).not.toBeNull())
    captured.onNodeDragStart({}, { id: 'a' })
    const trash = await waitFor(() =>
      document.querySelector('[data-testid="trash-zone"]') ?? screen.getByLabelText(/trash|ลบ/i),
    )
    trash.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100 })
    captured.onNodeDragStop({ clientX: 50, clientY: 50 }, storeState.nodes[0])
    expect(storeState.removeNode).toHaveBeenCalledWith('a')
    expect(storeState.setEdges).not.toHaveBeenCalled()
  })
})
