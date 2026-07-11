// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: () => null,
  useNodeConnections: () => [],
}))
vi.mock('./ConnectionDot', () => ({ default: () => null }))

const { default: UpdateNode } = await import('./UpdateNode')

describe('UpdateNode', () => {
  it('renders summary and timestamp', () => {
    render(
      <UpdateNode
        id="u1"
        data={{ summary: 'hi', timestamp: '2026-07-12T00:00:00.000Z' }}
        selected={false}
      />,
    )
    expect(screen.getByText('hi')).toBeTruthy()
    expect(screen.getByText('2026-07-12T00:00:00.000Z')).toBeTruthy()
  })
})
