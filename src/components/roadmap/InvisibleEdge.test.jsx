// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import InvisibleEdge from './InvisibleEdge'

describe('InvisibleEdge', () => {
  it('renders nothing — blocks snap edge-to-edge, no line is drawn', () => {
    const { container } = render(<InvisibleEdge />)
    expect(container.innerHTML).toBe('')
  })
})
