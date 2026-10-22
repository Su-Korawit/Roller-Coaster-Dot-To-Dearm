// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useUserStore } from '../stores/useUserStore'

let authState
vi.mock('../firebase', () => ({ auth: { currentUser: { uid: 'u1', displayName: 'Test User' } } }))
vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  updateDoc: vi.fn(() => Promise.resolve()),
}))
vi.mock('firebase/auth', () => ({ updateProfile: vi.fn(() => Promise.resolve()) }))
vi.mock('../lib/db', () => ({ refs: { user: vi.fn(() => ({})) } }))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(authState) }))
vi.mock('../stores/useSelectStore', () => ({ useSelectStore: (sel) => sel({ resetSelection: vi.fn() }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

const { default: SettingsSheet } = await import('./SettingsSheet')

describe('SettingsSheet', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1', displayName: 'Test User', photoURL: null }, signOut: vi.fn() }
    useUserStore.setState({
      uiVisibility: { hotbar: true, newsButton: true, musicPill: true, contactFab: true },
    })
  })

  it('shows the Profile fields on the Profile tab by default', () => {
    render(<SettingsSheet onClose={() => {}} />)
    expect(screen.getByPlaceholderText('ชื่อของคุณ')).toBeTruthy()
  })

  it('switching to the Interface tab hides Profile fields and shows HUD toggles', () => {
    render(<SettingsSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Interface' }))
    expect(screen.queryByPlaceholderText('ชื่อของคุณ')).toBeNull()
    expect(screen.getByText('แถบไอเทมด่วน (Hotbar)')).toBeTruthy()
  })

  it('switching to the Privacy tab hides the Interface toggles', () => {
    render(<SettingsSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Interface' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Privacy' }))
    expect(screen.queryByText('แถบไอเทมด่วน (Hotbar)')).toBeNull()
  })

  it('toggling the Hotbar switch flips uiVisibility.hotbar in the store, leaving others untouched', () => {
    render(<SettingsSheet onClose={() => {}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Interface' }))
    fireEvent.click(screen.getByRole('switch', { name: 'แถบไอเทมด่วน (Hotbar)' }))
    const { uiVisibility } = useUserStore.getState()
    expect(uiVisibility.hotbar).toBe(false)
    expect(uiVisibility.newsButton).toBe(true)
  })
})
