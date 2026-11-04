// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useUserStore } from '../stores/useUserStore'

let authState
vi.mock('../firebase', () => ({ auth: { currentUser: { uid: 'u1', displayName: 'T' } } }))
vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(() => Promise.resolve({ exists: () => false })), updateDoc: vi.fn() }))
vi.mock('firebase/auth', () => ({ updateProfile: vi.fn() }))
vi.mock('../lib/db', () => ({ refs: { user: vi.fn(() => ({})) } }))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(authState) }))
vi.mock('../stores/useSelectStore', () => ({ useSelectStore: (sel) => sel({ resetSelection: vi.fn() }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('./DeleteAccountSheet', () => ({ default: () => null }))
const playSound = vi.fn()
vi.mock('../lib/sfx', () => ({ playSound: (...a) => playSound(...a) }))

const { default: SettingsSheet } = await import('./SettingsSheet')

beforeEach(() => {
  authState = { user: { uid: 'u1', displayName: 'T', photoURL: null }, signOut: vi.fn() }
  useUserStore.setState({ sfxEnabled: true, sfxVolume: 0.5, uiVisibility: { hotbar: true, newsButton: true, musicPill: true, contactFab: true } })
  playSound.mockReset()
})
afterEach(cleanup)

const openGeneral = () => {
  render(<SettingsSheet onClose={() => {}} />)
  fireEvent.click(screen.getByRole('tab', { name: 'General' }))
}

describe('Sound settings', () => {
  it('shows the switch (on) and a volume slider at the saved level', () => {
    openGeneral()
    expect(screen.getByRole('switch', { name: 'เสียงเอฟเฟกต์' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByLabelText('ระดับเสียงเอฟเฟกต์').value).toBe('50')
  })

  it('the slider writes the volume to the store as 0-1', () => {
    openGeneral()
    fireEvent.change(screen.getByLabelText('ระดับเสียงเอฟเฟกต์'), { target: { value: '80' } })
    expect(useUserStore.getState().sfxVolume).toBe(0.8)
  })

  it('switching off persists the choice and hides the slider', () => {
    openGeneral()
    fireEvent.click(screen.getByRole('switch', { name: 'เสียงเอฟเฟกต์' }))
    expect(useUserStore.getState().sfxEnabled).toBe(false)
    expect(screen.queryByLabelText('ระดับเสียงเอฟเฟกต์')).toBeNull()
  })

  it('store setters clamp the volume and coerce the flag', () => {
    useUserStore.getState().setSfxVolume(7)
    expect(useUserStore.getState().sfxVolume).toBe(1)
    useUserStore.getState().setSfxVolume(-3)
    expect(useUserStore.getState().sfxVolume).toBe(0)
    useUserStore.getState().setSfxVolume('abc')
    expect(useUserStore.getState().sfxVolume).toBe(0)
    useUserStore.getState().setSfxEnabled(0)
    expect(useUserStore.getState().sfxEnabled).toBe(false)
  })
})
