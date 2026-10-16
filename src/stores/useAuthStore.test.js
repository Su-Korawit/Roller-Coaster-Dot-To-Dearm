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

describe('useAuthStore creator claims', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    m.bootstrapSession.mockResolvedValue(undefined)
    useAuthStore.setState({ user: null, claims: null, loading: true })
  })

  const fbUser = (claims, extra = {}) => ({
    uid: 'u1',
    getIdToken: vi.fn().mockResolvedValue('tok'),
    getIdTokenResult: vi.fn().mockResolvedValue({ claims }),
    ...extra,
  })

  it('reads custom claims after sign-in', async () => {
    await m.authStateCallback(fbUser({ creator: true }))
    expect(useAuthStore.getState().claims).toEqual({ creator: true })
  })

  it('keeps claims null for a signed-out user', async () => {
    await m.authStateCallback(null)
    expect(useAuthStore.getState().claims).toBeNull()
  })

  it('does not break sign-in when the token result cannot be read', async () => {
    const user = fbUser({}, { getIdTokenResult: vi.fn().mockRejectedValue(new Error('offline')) })
    await m.authStateCallback(user)
    expect(useAuthStore.getState().loading).toBe(false)
    expect(useAuthStore.getState().claims).toBeNull()
  })

  it('refreshClaims forces a new token and picks up a freshly granted role', async () => {
    const user = fbUser({})
    await m.authStateCallback(user)
    expect(useAuthStore.getState().claims).toEqual({})

    user.getIdTokenResult.mockResolvedValue({ claims: { creator: true } })
    await useAuthStore.getState().refreshClaims()

    expect(user.getIdToken).toHaveBeenCalledWith(true)
    expect(useAuthStore.getState().claims).toEqual({ creator: true })
  })

  it('refreshClaims is a no-op when signed out', async () => {
    await expect(useAuthStore.getState().refreshClaims()).resolves.toBeUndefined()
  })
})
