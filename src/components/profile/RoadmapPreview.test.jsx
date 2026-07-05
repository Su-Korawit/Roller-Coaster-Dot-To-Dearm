// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let roadmapState

vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel(roadmapState),
}))
vi.mock('../roadmap/nodeTypes', () => ({
  nodeTypes: {},
}))
// Real <ReactFlow> needs browser measuring APIs (ResizeObserver etc.) jsdom
// doesn't provide. This component's own logic (empty state vs. preview,
// onOpen wiring) is what's under test here — actual React Flow rendering is
// verified manually in npm run dev (Step 5).
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }) => <div data-testid="react-flow-stub">{children}</div>,
  ReactFlowProvider: ({ children }) => <>{children}</>,
  Background: () => null,
}))

const { default: RoadmapPreview } = await import('./RoadmapPreview')

describe('RoadmapPreview', () => {
  it('shows an empty-state prompt when the roadmap has no nodes', () => {
    roadmapState = { nodes: [], edges: [] }
    render(<RoadmapPreview onOpen={() => {}} />)
    expect(screen.getByText('No roadmap yet — tap to create one')).toBeTruthy()
    expect(screen.queryByTestId('react-flow-stub')).toBeNull()
  })

  it('renders the React Flow preview when nodes exist', () => {
    roadmapState = { nodes: [{ id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} }], edges: [] }
    render(<RoadmapPreview onOpen={() => {}} />)
    expect(screen.getByTestId('react-flow-stub')).toBeTruthy()
  })

  it('calls onOpen when the preview is tapped', () => {
    roadmapState = { nodes: [{ id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} }], edges: [] }
    const onOpen = vi.fn()
    render(<RoadmapPreview onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalled()
  })

  it('calls onOpen from the empty state too', () => {
    roadmapState = { nodes: [], edges: [] }
    const onOpen = vi.fn()
    render(<RoadmapPreview onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalled()
  })
})
