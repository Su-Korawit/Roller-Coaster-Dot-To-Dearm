// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const updateNodeData = vi.fn()
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData }),
}))
// ConnectionDot uses React Flow's useNodeConnections, which requires a
// <ReactFlowProvider> we don't have in this standalone render — mock it out.
vi.mock('./ConnectionDot', () => ({ default: () => null }))

const { default: ProcessNode } = await import('./ProcessNode')

describe('ProcessNode', () => {
  beforeEach(() => {
    updateNodeData.mockClear()
  })

  it('has no color picker', () => {
    render(<ProcessNode id="n1" data={{ label: '', note: '' }} selected={false} />)
    expect(screen.queryByLabelText('Choose block color')).toBeNull()
    expect(document.querySelector('input[type="color"]')).toBeNull()
  })

  it('ignores a stale data.color from old boards', () => {
    const { container } = render(
      <ProcessNode id="n1" data={{ label: '', note: '', color: '#ff0000' }} selected={false} />,
    )
    expect(container.firstChild.style.borderColor).toBe('')
  })

  it('has an expand button that opens the editor modal', () => {
    render(<ProcessNode id="n1" data={{ label: 'Step', note: 'a long note' }} selected={false} />)
    expect(screen.queryByTestId('process-editor-backdrop')).toBeNull()
    fireEvent.click(screen.getByLabelText('ขยายดู/แก้ไข'))
    expect(screen.getByTestId('process-editor-backdrop')).toBeTruthy()
  })
})
