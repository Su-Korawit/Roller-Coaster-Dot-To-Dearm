// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const updateNodeData = vi.fn()
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData }),
}))
// ConnectionDot uses React Flow's useNodeConnections, which requires a
// <ReactFlowProvider> we don't have in this standalone render — mock it out,
// the same way its rendering is irrelevant to the color-picker behavior under test.
vi.mock('./ConnectionDot', () => ({ default: () => null }))

const { default: ProcessNode } = await import('./ProcessNode')

describe('ProcessNode color picker', () => {
  beforeEach(() => {
    updateNodeData.mockClear()
  })

  it('clicking the color swatch opens the native color input', () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    render(<ProcessNode id="n1" data={{ label: '', note: '', color: null }} selected={false} />)
    fireEvent.click(screen.getByLabelText('Choose block color'))
    expect(clickSpy).toHaveBeenCalledTimes(1)
    clickSpy.mockRestore()
  })

  it('changing the hidden color input patches data.color for this node', () => {
    render(<ProcessNode id="n1" data={{ label: '', note: '', color: null }} selected={false} />)
    const colorInput = document.querySelector('input[type="color"]')
    fireEvent.change(colorInput, { target: { value: '#a78bfa' } })
    expect(updateNodeData).toHaveBeenCalledWith('n1', { color: '#a78bfa' })
  })

  it('applies data.color as an inline borderColor style', () => {
    const { container } = render(<ProcessNode id="n1" data={{ label: '', note: '', color: '#ff0000' }} selected={false} />)
    expect(container.firstChild.style.borderColor).toBe('rgb(255, 0, 0)')
  })
})
