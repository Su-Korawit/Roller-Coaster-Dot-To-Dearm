import { describe, it, expect, vi, beforeEach } from 'vitest'

const reauthenticateWithPopup = vi.fn()
const reauthenticateWithCredential = vi.fn()
vi.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: (email, password) => ({ email, password }) },
  GoogleAuthProvider: class GoogleAuthProvider {},
  reauthenticateWithCredential: (...a) => reauthenticateWithCredential(...a),
  reauthenticateWithPopup: (...a) => reauthenticateWithPopup(...a),
  signOut: vi.fn(),
}))
vi.mock('firebase/functions', () => ({ getFunctions: vi.fn(), httpsCallable: vi.fn() }))
vi.mock('../firebase', () => ({ auth: { currentUser: null } }))

const {
  DELETE_CONFIRM_PHRASE, hasProvider, needsPassword, localKeysToClear, clearLocalData,
  deletionErrorMessage, deleteMyAccount,
} = await import('./accountDeletion')

const googleUser = () => ({ email: 'g@x', providerData: [{ providerId: 'google.com' }], getIdToken: vi.fn(async () => 't') })
const passwordUser = () => ({ email: 'p@x', providerData: [{ providerId: 'password' }], getIdToken: vi.fn(async () => 't') })

const fakeStorage = (obj) => {
  const data = { ...obj }
  return {
    get length() { return Object.keys(data).length },
    key: (i) => Object.keys(data)[i] ?? null,
    removeItem: (k) => { delete data[k] },
    _data: data,
  }
}

beforeEach(() => { reauthenticateWithPopup.mockReset(); reauthenticateWithCredential.mockReset() })

describe('provider helpers', () => {
  it('needs a password only for email+password accounts that are not also Google', () => {
    expect(needsPassword(passwordUser())).toBe(true)
    expect(needsPassword(googleUser())).toBe(false)
    expect(needsPassword({ providerData: [{ providerId: 'password' }, { providerId: 'google.com' }] })).toBe(false)
    expect(needsPassword(null)).toBe(false)
    expect(hasProvider(googleUser(), 'google.com')).toBe(true)
  })

  it('the confirmation phrase is the Thai words for "delete account"', () => {
    expect(DELETE_CONFIRM_PHRASE).toBe('ลบบัญชี')
  })
})

describe('local data clearing', () => {
  it('removes only this app’s rc- keys, from both storages, and leaves everything else', () => {
    const local = fakeStorage({ 'rc-roadmap-store': '1', 'rc-guest-dirty': '1', theme: 'dark', other: 'x' })
    const session = fakeStorage({ 'rc-consent-pending': '1', keep: 'y' })
    expect(localKeysToClear(local).sort()).toEqual(['rc-guest-dirty', 'rc-roadmap-store'])
    clearLocalData(local, session)
    expect(Object.keys(local._data).sort()).toEqual(['other', 'theme'])
    expect(Object.keys(session._data)).toEqual(['keep'])
  })

  it('survives blocked or missing storage', () => {
    expect(() => clearLocalData(null, undefined)).not.toThrow()
    const hostile = { get length() { throw new Error('blocked') }, key: () => null, removeItem: () => {} }
    expect(() => clearLocalData(hostile, hostile)).not.toThrow()
  })
})

describe('deletionErrorMessage', () => {
  it('stays silent when the person cancels the Google popup', () => {
    expect(deletionErrorMessage({ code: 'auth/popup-closed-by-user' })).toBeNull()
    expect(deletionErrorMessage({ code: 'auth/cancelled-popup-request' })).toBeNull()
  })
  it('explains wrong passwords, offline, popup blockers and server rejections in Thai', () => {
    expect(deletionErrorMessage({ code: 'auth/wrong-password' })).toContain('รหัสผ่าน')
    expect(deletionErrorMessage({ code: 'auth/invalid-credential' })).toContain('รหัสผ่าน')
    expect(deletionErrorMessage({ code: 'auth/network-request-failed' })).toContain('อินเทอร์เน็ต')
    expect(deletionErrorMessage({ code: 'auth/popup-blocked' })).toContain('ป๊อปอัป')
    expect(deletionErrorMessage({ message: 'REAUTH_REQUIRED' })).toContain('ยืนยันตัวตน')
    expect(deletionErrorMessage({ message: 'ADMIN_PROTECTED' })).toContain('ผู้ดูแลระบบหลัก')
  })
  it('the generic failure tells the student their data is still intact', () => {
    expect(deletionErrorMessage(new Error('boom'))).toContain('ข้อมูลของคุณยังอยู่ครบ')
  })
})

describe('deleteMyAccount', () => {
  const deps = (over = {}) => ({
    user: googleUser(), call: vi.fn(async () => ({ ok: true })), clear: vi.fn(), logOut: vi.fn(async () => {}), ...over,
  })

  it('Google account: re-authenticates with the popup, refreshes the token, calls the server, then clears and signs out — in that order', async () => {
    const order = []
    const user = googleUser()
    user.getIdToken = vi.fn(async () => { order.push('token'); return 't' })
    reauthenticateWithPopup.mockImplementation(async () => { order.push('reauth') })
    const d = deps({
      user,
      call: vi.fn(async () => { order.push('server'); return { ok: true } }),
      clear: vi.fn(() => order.push('clear')),
      logOut: vi.fn(async () => { order.push('signout') }),
    })
    expect(await deleteMyAccount({}, d)).toEqual({ ok: true })
    expect(order).toEqual(['reauth', 'token', 'server', 'clear', 'signout'])
    expect(user.getIdToken).toHaveBeenCalledWith(true)
  })

  it('email account: re-authenticates with the typed password via a credential', async () => {
    const d = deps({ user: passwordUser() })
    await deleteMyAccount({ password: 'hunter2' }, d)
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(d.user, { email: 'p@x', password: 'hunter2' })
    expect(reauthenticateWithPopup).not.toHaveBeenCalled()
  })

  it('a wrong password stops everything: no server call, nothing cleared, not signed out', async () => {
    reauthenticateWithCredential.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/wrong-password' }))
    const d = deps({ user: passwordUser() })
    await expect(deleteMyAccount({ password: 'nope' }, d)).rejects.toMatchObject({ code: 'auth/wrong-password' })
    expect(d.call).not.toHaveBeenCalled()
    expect(d.clear).not.toHaveBeenCalled()
    expect(d.logOut).not.toHaveBeenCalled()
  })

  it('a server failure leaves local data and the session untouched so the person can retry', async () => {
    const d = deps({ call: vi.fn(async () => { throw new Error('REAUTH_REQUIRED') }) })
    await expect(deleteMyAccount({}, d)).rejects.toThrow('REAUTH_REQUIRED')
    expect(d.clear).not.toHaveBeenCalled()
    expect(d.logOut).not.toHaveBeenCalled()
  })

  it('still finishes when sign-out throws because the token is already dead', async () => {
    const d = deps({ logOut: vi.fn(async () => { throw new Error('invalid token') }) })
    await expect(deleteMyAccount({}, d)).resolves.toEqual({ ok: true })
    expect(d.clear).toHaveBeenCalled()
  })

  it('refuses when nobody is signed in', async () => {
    await expect(deleteMyAccount({}, { user: null })).rejects.toMatchObject({ code: 'app/not-signed-in' })
  })
})
