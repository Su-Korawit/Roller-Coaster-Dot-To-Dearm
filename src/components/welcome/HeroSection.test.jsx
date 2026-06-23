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

  it('Register and Login deep-link into the auth tabs', () => {
    render(<HeroSection />)
    fireEvent.click(screen.getByRole('button', { name: /register/i }))
    expect(navigate).toHaveBeenCalledWith('/auth?mode=register')
    fireEvent.click(screen.getByRole('button', { name: /login/i }))
    expect(navigate).toHaveBeenCalledWith('/auth?mode=login')
  })

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
})
