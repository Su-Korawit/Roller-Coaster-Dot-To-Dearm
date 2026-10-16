// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))
vi.mock('../lib/site', () => ({ currentSite: 'app' }))
const consent = { markConsentPending: vi.fn(), clearPendingConsent: vi.fn() }
vi.mock('../services/consent', () => consent)

const { default: AuthPage } = await import('./AuthPage')

function renderAt(url, state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: url.split('?')[0], search: url.includes('?') ? `?${url.split('?')[1]}` : '', state }]}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/home" element={<div>HOME</div>} />
        <Route path="/studio" element={<div>STUDIO</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const tickBoth = () => screen.getAllByRole('checkbox').forEach((c) => fireEvent.click(c))
const fillEmail = () => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret1' } })
}

describe('AuthPage', () => {
  beforeEach(() => {
    authState = { user: null, signIn: vi.fn(async () => {}), loading: false }
    consent.markConsentPending.mockReset()
    consent.clearPendingConsent.mockReset()
  })

  it('opens in register mode from ?mode=register', () => {
    renderAt('/auth?mode=register')
    // The "create account" submit label only appears in register mode.
    expect(screen.getByRole('button', { name: 'สร้างบัญชี' })).toBeTruthy()
  })

  it('opens in login mode by default', () => {
    renderAt('/auth')
    expect(screen.getByRole('tab', { name: 'เข้าสู่ระบบ', selected: true })).toBeTruthy()
  })

  it('redirects to /home when already authenticated', () => {
    authState = { user: { uid: 'u1' }, signIn: vi.fn(), loading: false }
    renderAt('/auth')
    expect(screen.getByText('HOME')).toBeTruthy()
  })
})

describe('AuthPage return path', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' }, signIn: vi.fn(), loading: false }
  })

  it('returns to the page that sent the visitor to sign in', () => {
    renderAt('/auth', { from: '/studio' })
    expect(screen.getByText('STUDIO')).toBeTruthy()
  })

  it('never follows an off-site or protocol-relative return path', () => {
    renderAt('/auth', { from: '//evil.test/x' })
    expect(screen.getByText('HOME')).toBeTruthy()
  })
})

describe('AuthPage consent (PDPA)', () => {
  beforeEach(() => {
    authState = { user: null, signIn: vi.fn(async () => {}), loading: false }
    consent.markConsentPending.mockReset()
    consent.clearPendingConsent.mockReset()
  })

  it('links to the Terms and the Privacy Policy', () => {
    renderAt('/auth')
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(expect.arrayContaining(['/terms', '/privacy']))
  })

  it('Google sign-in is refused until both boxes are ticked, and says why', () => {
    renderAt('/auth')
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google' }))
    expect(authState.signIn).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('ยอมรับข้อกำหนด')
    expect(consent.markConsentPending).not.toHaveBeenCalled()
  })

  it('one box is not enough', () => {
    renderAt('/auth')
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google' }))
    expect(authState.signIn).not.toHaveBeenCalled()
  })

  it('with both boxes ticked Google sign-in leaves the consent marker and signs in', async () => {
    renderAt('/auth')
    tickBoth()
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google' }))
    await waitFor(() => expect(authState.signIn).toHaveBeenCalledWith('google'))
    expect(consent.markConsentPending).toHaveBeenCalledTimes(1)
  })

  it('registering by email is blocked without consent, allowed with it', async () => {
    renderAt('/auth?mode=register')
    fillEmail()
    fireEvent.click(screen.getByRole('button', { name: 'สร้างบัญชี' }))
    expect(authState.signIn).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('ก่อนสมัครสมาชิก')

    tickBoth()
    fireEvent.click(screen.getByRole('button', { name: 'สร้างบัญชี' }))
    await waitFor(() => expect(authState.signIn).toHaveBeenCalledWith('register', { email: 'a@b.co', password: 'secret1' }))
    expect(consent.markConsentPending).toHaveBeenCalledTimes(1)
  })

  it('logging in to an existing account does not require the boxes (ConsentGate covers old accounts)', async () => {
    renderAt('/auth')
    fillEmail()
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }))
    await waitFor(() => expect(authState.signIn).toHaveBeenCalledWith('login', { email: 'a@b.co', password: 'secret1' }))
    expect(consent.markConsentPending).not.toHaveBeenCalled()
  })

  it('a failed sign-in clears the marker so it cannot leak into another account', async () => {
    authState.signIn = vi.fn(async () => { throw Object.assign(new Error('x'), { code: 'auth/popup-blocked' }) })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/auth')
    tickBoth()
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google' }))
    await waitFor(() => expect(consent.clearPendingConsent).toHaveBeenCalled())
  })
})
