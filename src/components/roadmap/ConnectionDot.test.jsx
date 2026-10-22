// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

let sourceConnections = []
let targetConnections = []
let nodeId = 'a'
let connectionState = { inProgress: false, fromNode: null, fromHandle: null }

vi.mock('@xyflow/react', () => ({
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  Handle: ({ className, id, position }) => (
    <div data-testid={`dot-${id ?? position}`} className={className} />
  ),
  useNodeId: () => nodeId,
  // Real hook with handleId:null returns every connection of that role on the node.
  useNodeConnections: ({ handleType }) =>
    handleType === 'source' ? sourceConnections : targetConnections,
  useConnection: (selector) => selector(connectionState),
}))

const { default: ConnectionDot } = await import('./ConnectionDot')

function ProcessStyleDots() {
  return (
    <>
      <ConnectionDot type="target" position="left" />
      <ConnectionDot id="top" type="source" position="top" />
      <ConnectionDot type="source" position="right" />
      <ConnectionDot id="bottom" type="source" position="bottom" />
    </>
  )
}

function dotClass(handleKey) {
  return screen.getByTestId(`dot-${handleKey}`).className
}

describe('ConnectionDot', () => {
  beforeEach(() => {
    sourceConnections = []
    targetConnections = []
    nodeId = 'a'
    connectionState = { inProgress: false, fromNode: null, fromHandle: null }
  })

  it('glows green when this dot holds a connection', () => {
    targetConnections = [{ source: 'x', target: 'a', targetHandle: null }]
    render(<ConnectionDot type="target" position="left" />)
    const cls = dotClass('left')
    expect(cls).toContain('!bg-lime')
    expect(cls).toContain('shadow-[0_0_8px_2px_rgba(192,212,112,0.85)]')
  })

  it('stays grey with no glow while free', () => {
    render(<ConnectionDot type="target" position="left" />)
    const cls = dotClass('left')
    expect(cls).toContain('!bg-hairline')
    expect(cls).not.toContain('shadow-[0_0_8px_2px_rgba(192,212,112,0.85)]')
  })

  it('does NOT glow an id-less dot when the connection is via a different handle', () => {
    sourceConnections = [
      { source: 'a', sourceHandle: 'top', target: 'b', targetHandle: null },
    ]
    render(<ProcessStyleDots />)

    expect(dotClass('right')).toContain('!bg-hairline')
    expect(dotClass('right')).not.toContain('!bg-lime')
    expect(dotClass('top')).toContain('!bg-lime')
    expect(dotClass('bottom')).toContain('!bg-hairline')
  })

  it('glows the id-less dot when the connection really uses it', () => {
    sourceConnections = [
      { source: 'a', sourceHandle: null, target: 'b', targetHandle: null },
    ]
    render(<ProcessStyleDots />)

    expect(dotClass('right')).toContain('!bg-lime')
    expect(dotClass('top')).toContain('!bg-hairline')
    expect(dotClass('bottom')).toContain('!bg-hairline')
  })

  it('focus-highlights only the origin dot during an in-progress connection drag', () => {
    connectionState = {
      inProgress: true,
      fromNode: { id: 'a' },
      fromHandle: { id: 'top' },
    }
    render(<ProcessStyleDots />)

    expect(dotClass('top')).toContain('!bg-brand')
    expect(dotClass('top')).toContain('ring-2')
    expect(dotClass('right')).not.toContain('!bg-brand')
    expect(dotClass('right')).toContain('!bg-hairline')
  })
})
