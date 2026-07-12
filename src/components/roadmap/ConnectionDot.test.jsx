// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

let sourceConnections = []
let targetConnections = []
vi.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: ({ className }) => <div data-testid="dot" className={className} />,
  useNodeConnections: ({ handleType }) =>
    handleType === 'source' ? sourceConnections : targetConnections,
}))

const { default: ConnectionDot } = await import('./ConnectionDot')

describe('ConnectionDot', () => {
  beforeEach(() => {
    sourceConnections = []
    targetConnections = []
  })

  it('glows green when this dot holds a connection', () => {
    targetConnections = [{ source: 'a', target: 'b' }]
    render(<ConnectionDot type="target" position="left" />)
    const cls = screen.getByTestId('dot').className
    expect(cls).toContain('!bg-green-400')
    expect(cls).toContain('shadow-[0_0_8px_2px_rgba(74,222,128,0.8)]')
  })

  it('stays grey with no glow while free', () => {
    render(<ConnectionDot type="target" position="left" />)
    const cls = screen.getByTestId('dot').className
    expect(cls).toContain('!bg-gray-300')
    expect(cls).not.toContain('shadow-[0_0_8px_2px_rgba(74,222,128,0.8)]')
  })
})
