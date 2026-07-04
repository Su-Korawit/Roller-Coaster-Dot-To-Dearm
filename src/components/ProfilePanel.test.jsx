// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

let authState
let selectState
let resolveGetDoc

vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(() => new Promise((resolve) => { resolveGetDoc = resolve })),
}))

vi.mock('../lib/db', () => ({
  refs: { user: (uid) => ({ path: `users/${uid}` }) },
}))

vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

vi.mock('../stores/useSelectStore', () => ({
  useSelectStore: (sel) => sel(selectState),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('./profile/JourneyManager', () => ({
  default: () => <div data-testid="journey-manager" />,
}))

vi.mock('./SettingsSheet', () => ({
  default: () => null,
}))

const { default: ProfilePanel } = await import('./ProfilePanel')

describe('ProfilePanel', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1', displayName: 'Auth Name', photoURL: null } }
    selectState = { mbti: 'INTJ' }
    resolveGetDoc = null
  })

  it('shows header skeleton while Firestore profile is loading', async () => {
    render(<ProfilePanel onClose={vi.fn()} />)
    expect(screen.getByTestId('profile-header-skeleton')).toBeTruthy()
    expect(screen.queryByText('Auth Name')).toBeFalsy()

    resolveGetDoc({
      exists: () => true,
      data: () => ({ displayName: 'Firestore Name', photoURL: null, bio: 'Hello' }),
    })

    await waitFor(() => {
      expect(screen.queryByTestId('profile-header-skeleton')).toBeFalsy()
    })
    expect(screen.getByText('Firestore Name')).toBeTruthy()
  })
})
