// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('./ConnectionDot', () => ({ default: () => null }))
vi.mock('./VideoPickerModal', () => ({
  default: ({ nodeId }) => <div data-testid="picker" data-node-id={nodeId} />,
}))
vi.mock('./MediaLightbox', () => ({
  default: ({ items }) => <div data-testid="lightbox" data-count={items.length} data-type={items[0]?.type} />,
}))

const { default: VideoNode } = await import('./VideoNode')

describe('VideoNode', () => {
  it('shows the empty state and opens the picker when tapped', () => {
    render(<VideoNode id="n1" data={{}} selected={false} />)
    expect(screen.getByText('tap to choose')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Choose video' }))
    expect(screen.getByTestId('picker').dataset.nodeId).toBe('n1')
  })

  it('renders the video element once a url is set', () => {
    render(<VideoNode id="n1" data={{ url: 'clip.mp4' }} selected={false} />)
    const video = document.querySelector('video')
    expect(video.src).toContain('clip.mp4')
  })

  it('opens the lightbox with a single video item', () => {
    render(<VideoNode id="n1" data={{ url: 'clip.mp4' }} selected={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'ขยายวิดีโอ' }))
    expect(screen.getByTestId('lightbox').dataset.count).toBe('1')
    expect(screen.getByTestId('lightbox').dataset.type).toBe('video')
  })
})
