// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const updateNodeData = vi.fn()
vi.mock('../../stores/useRoadmapStore', () => ({
  useRoadmapStore: (sel) => sel({ updateNodeData }),
}))

const { default: ProcessEditorModal } = await import('./ProcessEditorModal')

describe('ProcessEditorModal', () => {
  beforeEach(() => updateNodeData.mockClear())

  it('shows the current label and note', () => {
    render(<ProcessEditorModal nodeId="n1" data={{ label: 'Apply', note: 'Deadline soon' }} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('Apply')).toBeTruthy()
    expect(screen.getByDisplayValue('Deadline soon')).toBeTruthy()
  })

  it('edits patch the node via updateNodeData', () => {
    render(<ProcessEditorModal nodeId="n1" data={{ label: '', note: '' }} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'New title' } })
    expect(updateNodeData).toHaveBeenCalledWith('n1', { label: 'New title' })
    fireEvent.change(screen.getByPlaceholderText('Note (optional)'), { target: { value: 'New note' } })
    expect(updateNodeData).toHaveBeenCalledWith('n1', { note: 'New note' })
  })

  it('closes on backdrop click and Escape', () => {
    const onClose = vi.fn()
    render(<ProcessEditorModal nodeId="n1" data={{ label: '', note: '' }} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('process-editor-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
