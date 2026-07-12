// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('./ConnectionDot', () => ({ default: () => null }))
vi.mock('./FilePickerModal', () => ({
  default: ({ nodeId }) => <div data-testid="picker" data-node-id={nodeId} />,
}))
vi.mock('./FileViewerModal', () => ({
  default: ({ url, name }) => <div data-testid="viewer" data-url={url} data-name={name} />,
}))

const { default: FileNode } = await import('./FileNode')

describe('FileNode', () => {
  it('renders the empty state with a choose prompt', () => {
    render(<FileNode id="n1" data={{ url: '', name: '' }} selected={false} />)
    expect(screen.getByText('tap to choose')).toBeTruthy()
  })

  it('shows the file name and extension badge when a file is set', () => {
    render(<FileNode id="n1" data={{ url: 'https://x/f', name: 'answer-key.pdf' }} selected={false} />)
    expect(screen.getByText('answer-key.pdf')).toBeTruthy()
    expect(screen.getByText('PDF')).toBeTruthy()
  })

  it('opens the picker when the empty block is clicked', () => {
    render(<FileNode id="n1" data={{ url: '', name: '' }} selected={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }))
    expect(screen.getByTestId('picker').dataset.nodeId).toBe('n1')
  })
})
