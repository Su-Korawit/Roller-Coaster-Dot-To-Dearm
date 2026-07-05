// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let roadmapState
let userState

// @xyflow/react's Handle/useNodeConnections normally require a
// <ReactFlowProvider> ancestor. These tests exercise StartNode's own logic
// (picker, live display, write-back) in isolation, so the React-Flow-specific
// bits ConnectionDot depends on are stubbed out here — this is the pattern to
// reuse for any future roadmap node-component test.
vi.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: () => null,
  useNodeConnections: () => [],
}))
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel(roadmapState),
}))
vi.mock('../../stores/useUserStore', () => ({
  useUserStore: (sel) => sel(userState),
}))

const { default: StartNode } = await import('./StartNode')

describe('StartNode', () => {
  beforeEach(() => {
    roadmapState = { updateNodeData: vi.fn() }
    userState = {
      journeys: {
        mastery: [{ id: 'm1', title: 'Learn React', progress: 40 }],
        career: [],
        university: [],
      },
      updateJourneyProgress: vi.fn(),
    }
  })

  it('shows the Link to Journey button when journeyRef is null', () => {
    render(<StartNode id="n1" data={{ journeyRef: null }} selected={false} />)
    expect(screen.getByText('Link to Journey')).toBeTruthy()
  })

  it('opens the picker and links a journey on selection', () => {
    render(<StartNode id="n1" data={{ journeyRef: null }} selected={false} />)
    fireEvent.click(screen.getByText('Link to Journey'))
    fireEvent.click(screen.getByText('Learn React'))
    expect(roadmapState.updateNodeData).toHaveBeenCalledWith('n1', {
      journeyRef: { category: 'mastery', id: 'm1' },
    })
  })

  it('renders the live title and progress once linked', () => {
    render(<StartNode id="n1" data={{ journeyRef: { category: 'mastery', id: 'm1' } }} selected={false} />)
    expect(screen.getByText('Learn React')).toBeTruthy()
    expect(screen.getByText('40%')).toBeTruthy()
  })

  it('calls updateJourneyProgress with a Roadmap-attributed note on +10% progress', () => {
    render(<StartNode id="n1" data={{ journeyRef: { category: 'mastery', id: 'm1' } }} selected={false} />)
    fireEvent.click(screen.getByText('+10% progress'))
    expect(userState.updateJourneyProgress).toHaveBeenCalledWith('mastery', 'm1', '+10% via Roadmap', 10)
  })

  it('shows a removed-journey state without crashing when the linked item is gone', () => {
    render(<StartNode id="n1" data={{ journeyRef: { category: 'mastery', id: 'gone' } }} selected={false} />)
    expect(screen.getByText('Linked journey was removed')).toBeTruthy()
  })

  it('choosing another from the removed state clears journeyRef', () => {
    render(<StartNode id="n1" data={{ journeyRef: { category: 'mastery', id: 'gone' } }} selected={false} />)
    fireEvent.click(screen.getByText('Choose another'))
    expect(roadmapState.updateNodeData).toHaveBeenCalledWith('n1', { journeyRef: null })
  })
})
