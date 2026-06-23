// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let authState
const navigate = vi.fn()
vi.mock('../../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(authState) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

const { default: HeroSection } = await import('./HeroSection')

describe('HeroSection', () => {
  beforeEach(() => { authState = { user: null }; navigate.mockClear() })

  it('Play goes to /auth when logged out', () => {
    render(<HeroSection />)
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(navigate).toHaveBeenCalledWith('/auth?mode=login')
  })

  it('Play goes straight to /home when a session exists', () => {
    authState = { user: { uid: 'u1' } }
    render(<HeroSection />)
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(navigate).toHaveBeenCalledWith('/home')
  })

  it('renders video background when gamePreview has a video URL', () => {
    render(<HeroSection gamePreview={{ mediaUrl: 'https://example.com/game.mp4', mediaType: 'video' }} />)
    expect(document.querySelector('video[src="https://example.com/game.mp4"]')).toBeTruthy()
  })

  it('renders nothing video-related when gamePreview is null', () => {
    render(<HeroSection />)
    expect(document.querySelector('video')).toBeFalsy()
    expect(document.querySelector('img[aria-hidden="true"]')).toBeFalsy()
  })
})
