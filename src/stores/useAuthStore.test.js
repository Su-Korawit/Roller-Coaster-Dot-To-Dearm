import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  bootstrapSession: vi.fn(),
  teardownSession: vi.fn(),
  authStateCallback: null,
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => {
    m.authStateCallback = cb
    return () => {}
  },
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../firebase', () => ({ auth: {} }))
vi.mock('../services/sessionBootstrap', () => ({
  bootstrapSession: (...a) => m.bootstrapSession(...a),
  teardownSession: (...a) => m.teardownSession(...a),
}))

const { useAuthStore } = await import('./useAuthStore')

describe('useAuthStore onAuthStateChanged', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    useAuthStore.setState({ user: null, loading: true })
  })

  it('clears loading once bootstrapSession resolves', async () => {
    m.bootstrapSession.mockResolvedValue(undefined)

    await m.authStateCallback({ uid: 'u1' })

    expect(useAuthStore.getState().loading).toBe(false)
    expect(useAuthStore.getState().user).toEqual({ uid: 'u1' })
  })

  it('still clears loading when bootstrapSession rejects (regression: admin/RequireAuth must never see a stuck spinner or blank page)', async () => {
    m.bootstrapSession.mockRejectedValue(new Error('boom'))

    await m.authStateCallback({ uid: 'u1' })

    expect(useAuthStore.getState().loading).toBe(false)
    expect(useAuthStore.getState().user).toEqual({ uid: 'u1' })
  })

  it('still clears loading when teardownSession throws on sign-out', async () => {
    m.teardownSession.mockImplementation(() => {
      throw new Error('teardown boom')
    })

    await m.authStateCallback(null)

    expect(useAuthStore.getState().loading).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })
})
