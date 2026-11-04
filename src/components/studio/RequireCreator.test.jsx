// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

const auth = vi.hoisted(() => ({ state: {} }))
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (selector) => selector(auth.state),
}))

const { default: RequireCreator } = await import('./RequireCreator')

const renderGuard = () =>
  render(
    <MemoryRouter initialEntries={['/studio']}>
      <Routes>
        <Route path="/auth" element={<p>หน้าเข้าสู่ระบบ</p>} />
        <Route element={<RequireCreator />}>
          <Route path="/studio" element={<p>สตูดิโอ</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  auth.state = { user: null, claims: null, loading: false, refreshClaims: vi.fn().mockResolvedValue(undefined) }
})

describe('RequireCreator', () => {
  it('shows nothing while auth is loading', () => {
    auth.state.loading = true
    renderGuard()
    expect(screen.queryByText('สตูดิโอ')).toBeNull()
    expect(screen.queryByText('หน้าเข้าสู่ระบบ')).toBeNull()
  })

  it('sends signed-out visitors to the sign-in page', () => {
    renderGuard()
    expect(screen.getByText('หน้าเข้าสู่ระบบ')).toBeTruthy()
  })

  it('remembers where to come back to when it sends a visitor to sign in', () => {
    function AuthProbe() {
      return <p>{`from:${useLocation().state?.from}`}</p>
    }
    render(
      <MemoryRouter initialEntries={['/studio']}>
        <Routes>
          <Route path="/auth" element={<AuthProbe />} />
          <Route element={<RequireCreator />}>
            <Route path="/studio" element={<p>สตูดิโอ</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('from:/studio')).toBeTruthy()
  })

  it('lets a user with the creator claim in', () => {
    auth.state.user = { uid: 'alice' }
    auth.state.claims = { creator: true }
    renderGuard()
    expect(screen.getByText('สตูดิโอ')).toBeTruthy()
  })

  it('lets the super-admin in without a claim', () => {
    auth.state.user = { uid: 'IaltEhO0mPVfK3ng8npr4CdqnEE3' }
    renderGuard()
    expect(screen.getByText('สตูดิโอ')).toBeTruthy()
  })

  it('tells other users they cannot write yet and lets them refresh the role', () => {
    auth.state.user = { uid: 'carol' }
    auth.state.claims = {}
    renderGuard()
    expect(screen.getByText('บัญชีนี้ยังไม่มีสิทธิ์เขียนบทความ')).toBeTruthy()
    expect(screen.queryByText('สตูดิโอ')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'ลองรีเฟรชสิทธิ์' }))
    expect(auth.state.refreshClaims).toHaveBeenCalled()
  })

  it('does not accept a truthy but non-true creator value', () => {
    auth.state.user = { uid: 'carol' }
    auth.state.claims = { creator: 'yes' }
    renderGuard()
    expect(screen.queryByText('สตูดิโอ')).toBeNull()
  })
})
