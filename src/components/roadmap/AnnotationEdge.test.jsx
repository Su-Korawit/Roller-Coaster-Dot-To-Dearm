// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@xyflow/react', () => ({
  BaseEdge: (props) => <path data-testid="base-edge" {...props} />,
  getBezierPath: () => ['M0,0 L10,10', 5, 5],
}))

const { default: AnnotationEdge } = await import('./AnnotationEdge')

describe('AnnotationEdge', () => {
  it('renders a dashed bezier path', () => {
    const { getByTestId } = render(
      <svg><AnnotationEdge id="e1" sourceX={0} sourceY={0} targetX={10} targetY={10} /></svg>,
    )
    const edge = getByTestId('base-edge')
    expect(edge.getAttribute('path')).toBe('M0,0 L10,10')
    expect(edge.style.strokeDasharray).toBe('6 4')
  })
})
