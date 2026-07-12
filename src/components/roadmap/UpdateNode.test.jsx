// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: () => null,
  useNodeConnections: () => [],
}))
vi.mock('./ConnectionDot', () => ({ default: () => null }))

const updateNodeData = vi.fn()
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (selector) => selector({ updateNodeData }),
}))

const { default: UpdateNode } = await import('./UpdateNode')

describe('UpdateNode', () => {
  beforeEach(() => {
    updateNodeData.mockClear()
  })

  it('renders summary and timestamp', () => {
    render(
      <UpdateNode
        id="u1"
        data={{ summary: 'hi', timestamp: '2026-07-12T00:00:00.000Z' }}
        selected={false}
      />,
    )
    expect(screen.getByDisplayValue('hi')).toBeTruthy()
    expect(screen.getByText('2026-07-12T00:00:00.000Z')).toBeTruthy()
  })

  it('edits summary via the store (palette-created blocks start empty)', () => {
    render(<UpdateNode id="u1" data={{ summary: '' }} selected={false} />)

    fireEvent.change(screen.getByPlaceholderText('Summary'), {
      target: { value: 'blocked on rules deploy' },
    })

    expect(updateNodeData).toHaveBeenCalledWith('u1', { summary: 'blocked on rules deploy' })
  })

  it('is a 128×128 block like Process/Image', () => {
    const { container } = render(<UpdateNode id="u1" data={{ summary: '' }} selected={false} />)
    expect(container.firstChild.className).toContain('w-32 h-32')
  })
})
