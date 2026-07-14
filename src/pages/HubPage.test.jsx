// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../components/landing/SiteNav', () => ({
  default: () => <nav data-testid="site-nav" />,
  siteHref: (key) => (key === 'app' ? 'https://app.ilovetcas.com' : `/?site=${key}`),
}))
vi.mock('../components/welcome/WelcomeFooter', () => ({
  default: () => <footer data-testid="welcome-footer" />,
}))

const useGamePreviewMedia = vi.fn()
vi.mock('../hooks/useGamePreviewMedia', () => ({
  useGamePreviewMedia: (...args) => useGamePreviewMedia(...args),
}))

const { default: HubPage } = await import('./HubPage')

describe('HubPage app band', () => {
  beforeEach(() => {
    useGamePreviewMedia.mockReset()
  })

  it('renders video when mediaUrl is set with mediaType video', () => {
    useGamePreviewMedia.mockReturnValue({
      mediaUrl: 'https://cdn.example/preview.mp4',
      mediaType: 'video',
      loading: false,
    })
    const { container } = render(<HubPage />)

    const video = container.querySelector('video')
    expect(video).toBeTruthy()
    expect(video.getAttribute('src')).toBe('https://cdn.example/preview.mp4')
    expect(screen.getByText('CREATE YOUR VIBE SPACE')).toBeTruthy()
    expect(screen.getByText(/รวมทุก Feature/)).toBeTruthy()
    expect(container.querySelectorAll('a[href="https://app.ilovetcas.com"]')).toHaveLength(1)
  })

  it('falls back to text-only band when mediaUrl is null', () => {
    useGamePreviewMedia.mockReturnValue({
      mediaUrl: null,
      mediaType: null,
      loading: false,
    })
    const { container } = render(<HubPage />)

    const band = container.querySelector('section.bg-ink')
    expect(band.querySelector('video')).toBeNull()
    expect(band.querySelector('img')).toBeNull()
    expect(screen.getByText('CREATE YOUR VIBE SPACE')).toBeTruthy()
    expect(screen.getByText(/รวมทุก Feature/)).toBeTruthy()
    expect(container.querySelectorAll('a[href="https://app.ilovetcas.com"]')).toHaveLength(1)
  })
})
