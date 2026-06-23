// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

const { default: AuthPage } = await import('./AuthPage')

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/start" element={<div>START</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthPage', () => {
  beforeEach(() => { authState = { user: null, signIn: vi.fn(), loading: false } })

  it('opens in register mode from ?mode=register', () => {
    renderAt('/auth?mode=register')
    // The "create account" submit label only appears in register mode.
    expect(screen.getByRole('button', { name: 'สร้างบัญชี' })).toBeTruthy()
  })

  it('opens in login mode by default', () => {
    renderAt('/auth')
    expect(screen.getByRole('tab', { name: 'เข้าสู่ระบบ', selected: true })).toBeTruthy()
  })

  it('redirects to /start when already authenticated', () => {
    authState = { user: { uid: 'u1' }, signIn: vi.fn(), loading: false }
    renderAt('/auth')
    expect(screen.getByText('START')).toBeTruthy()
  })
})
