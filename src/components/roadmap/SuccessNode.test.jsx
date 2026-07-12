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

const { default: SuccessNode } = await import('./SuccessNode')

describe('SuccessNode', () => {
  beforeEach(() => {
    updateNodeData.mockClear()
  })

  it('edits summary via the store', () => {
    render(<SuccessNode id="s1" data={{ summary: '' }} selected={false} />)
    fireEvent.change(screen.getByPlaceholderText('Summary'), {
      target: { value: 'shipped' },
    })
    expect(updateNodeData).toHaveBeenCalledWith('s1', { summary: 'shipped' })
  })

  it('is a 128×128 block like Process/Image', () => {
    const { container } = render(<SuccessNode id="s1" data={{ summary: '' }} selected={false} />)
    expect(container.firstChild.className).toContain('w-32 h-32')
  })
})
