// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MediaLightbox from './MediaLightbox'

describe('MediaLightbox', () => {
  it('renders the item at initialIndex', () => {
    render(
      <MediaLightbox
        items={[{ type: 'image', url: 'a.png' }, { type: 'image', url: 'b.png' }]}
        initialIndex={1}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByTestId('lightbox-media').src).toContain('b.png')
  })

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<MediaLightbox items={[{ type: 'image', url: 'a.png' }]} initialIndex={0} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('lightbox-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<MediaLightbox items={[{ type: 'image', url: 'a.png' }]} initialIndex={0} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'ปิด' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('navigates forward and backward through the album, wrapping at the ends', () => {
    render(
      <MediaLightbox
        items={[{ type: 'image', url: 'a.png' }, { type: 'image', url: 'b.png' }]}
        initialIndex={0}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }))
    expect(screen.getByTestId('lightbox-media').src).toContain('b.png')
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }))
    expect(screen.getByTestId('lightbox-media').src).toContain('a.png')
    fireEvent.click(screen.getByRole('button', { name: 'ก่อนหน้า' }))
    expect(screen.getByTestId('lightbox-media').src).toContain('b.png')
  })

  it('renders a video with controls and hides nav arrows for a single item', () => {
    render(<MediaLightbox items={[{ type: 'video', url: 'clip.mp4' }]} initialIndex={0} onClose={vi.fn()} />)
    const video = screen.getByTestId('lightbox-media')
    expect(video.tagName).toBe('VIDEO')
    expect(video.src).toContain('clip.mp4')
    expect(screen.queryByRole('button', { name: 'ถัดไป' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'ก่อนหน้า' })).toBeNull()
  })
})
