// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let roadmapState

vi.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: () => null,
  useNodeConnections: () => [],
}))
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel(roadmapState),
}))

const { default: IdeaRootNode } = await import('./IdeaRootNode')

describe('IdeaRootNode', () => {
  beforeEach(() => {
    roadmapState = { updateNodeData: vi.fn() }
  })

  it('renders title and status, writes both via updateNodeData', () => {
    render(
      <IdeaRootNode
        id="r1"
        data={{ title: 'Ship IR', status: 'idea' }}
        selected={false}
      />,
    )
    expect(screen.getByDisplayValue('Ship IR')).toBeTruthy()
    fireEvent.change(screen.getByDisplayValue('Ship IR'), {
      target: { value: 'Ship IR Board' },
    })
    expect(roadmapState.updateNodeData).toHaveBeenCalledWith('r1', {
      title: 'Ship IR Board',
    })
    fireEvent.change(screen.getByLabelText('Idea status'), {
      target: { value: 'planned' },
    })
    expect(roadmapState.updateNodeData).toHaveBeenCalledWith('r1', {
      status: 'planned',
    })
  })

  it('is a 128×128 block like Process/Image', () => {
    const { container } = render(<IdeaRootNode id="i1" data={{ title: '', status: 'idea' }} selected={false} />)
    expect(container.firstChild.className).toContain('w-32 h-32')
  })
})
