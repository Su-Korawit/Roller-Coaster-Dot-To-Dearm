// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./ui/Popup', () => ({ default: ({ children }) => <div>{children}</div> }))
let authState
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(authState) }))
const svc = {
  deleteMyAccount: vi.fn(),
  deletionErrorMessage: vi.fn((e) => (e?.message === 'cancel' ? null : 'ลบบัญชีไม่สำเร็จ ข้อมูลของคุณยังอยู่ครบ')),
}
vi.mock('../services/accountDeletion', async (orig) => ({ ...(await orig()), ...svc }))
vi.mock('../firebase', () => ({ auth: {} }))
vi.mock('firebase/auth', () => ({
  EmailAuthProvider: {}, GoogleAuthProvider: class {}, reauthenticateWithCredential: vi.fn(),
  reauthenticateWithPopup: vi.fn(), signOut: vi.fn(),
}))
vi.mock('firebase/functions', () => ({ getFunctions: vi.fn(), httpsCallable: vi.fn() }))

const { default: DeleteAccountSheet } = await import('./DeleteAccountSheet')
const { ERASURE_DELETED, ERASURE_KEPT } = await import('../data/legalContent')

const googleUser = { providerData: [{ providerId: 'google.com' }] }
const passwordUser = { providerData: [{ providerId: 'password' }] }
const submitBtn = () => screen.getByRole('button', { name: /ลบบัญชีและข้อมูลของฉันถาวร|กำลังลบข้อมูล/ })
const typePhrase = (v = 'ลบบัญชี') => fireEvent.change(screen.getByLabelText('พิมพ์คำยืนยัน'), { target: { value: v } })

beforeEach(() => {
  authState = { user: googleUser }
  svc.deleteMyAccount.mockReset()
})
afterEach(cleanup)

describe('DeleteAccountSheet', () => {
  it('lists exactly what is deleted and what stays (same text as the privacy policy)', () => {
    render(<DeleteAccountSheet onClose={() => {}} />)
    for (const line of [...ERASURE_DELETED, ...ERASURE_KEPT]) expect(screen.getByText(line), line).toBeTruthy()
    expect(screen.getByText('การลบบัญชีกู้คืนไม่ได้')).toBeTruthy()
  })

  it('the delete button stays disabled until the exact phrase is typed', () => {
    render(<DeleteAccountSheet onClose={() => {}} />)
    expect(submitBtn().disabled).toBe(true)
    typePhrase('ลบ')
    expect(submitBtn().disabled).toBe(true)
    typePhrase('ลบบัญชี')
    expect(submitBtn().disabled).toBe(false)
    typePhrase('  ลบบัญชี  ')            // surrounding spaces are forgiven
    expect(submitBtn().disabled).toBe(false)
  })

  it('Google accounts see the popup notice and no password field', () => {
    render(<DeleteAccountSheet onClose={() => {}} />)
    expect(screen.queryByLabelText('รหัสผ่าน')).toBeNull()
    expect(screen.getByText(/หน้าต่าง Google/)).toBeTruthy()
  })

  it('email accounts must also type their password before the button enables', () => {
    authState = { user: passwordUser }
    render(<DeleteAccountSheet onClose={() => {}} />)
    typePhrase()
    expect(submitBtn().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'hunter2' } })
    expect(submitBtn().disabled).toBe(false)
  })

  it('submits with the password, shows progress, and hands over to onDone on success', async () => {
    authState = { user: passwordUser }
    let finish
    svc.deleteMyAccount.mockReturnValue(new Promise((r) => { finish = r }))
    const onDone = vi.fn()
    render(<DeleteAccountSheet onClose={() => {}} onDone={onDone} />)
    typePhrase()
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'hunter2' } })
    fireEvent.click(submitBtn())
    await waitFor(() => expect(screen.getByText('กำลังลบข้อมูล…')).toBeTruthy())
    expect(svc.deleteMyAccount).toHaveBeenCalledWith({ password: 'hunter2' })
    expect(screen.getByText('ยกเลิก').disabled).toBe(true)        // cannot back out mid-erasure
    finish({ ok: true })
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('a failure shows the message, keeps the sheet open and lets the person retry', async () => {
    svc.deleteMyAccount.mockRejectedValue(new Error('server down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onDone = vi.fn()
    render(<DeleteAccountSheet onClose={() => {}} onDone={onDone} />)
    typePhrase()
    fireEvent.click(submitBtn())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('ข้อมูลของคุณยังอยู่ครบ'))
    expect(onDone).not.toHaveBeenCalled()
    expect(submitBtn().disabled).toBe(false)
  })

  it('cancelling the Google popup shows nothing (no error banner)', async () => {
    svc.deleteMyAccount.mockRejectedValue(new Error('cancel'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<DeleteAccountSheet onClose={() => {}} />)
    typePhrase()
    fireEvent.click(submitBtn())
    await waitFor(() => expect(submitBtn().disabled).toBe(false))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('Enter in the form cannot bypass the disabled state', () => {
    render(<DeleteAccountSheet onClose={() => {}} />)
    fireEvent.submit(screen.getByLabelText('พิมพ์คำยืนยัน').closest('form'))
    expect(svc.deleteMyAccount).not.toHaveBeenCalled()
  })

  it('cancel closes the sheet', () => {
    const onClose = vi.fn()
    render(<DeleteAccountSheet onClose={onClose} />)
    fireEvent.click(screen.getByText('ยกเลิก'))
    expect(onClose).toHaveBeenCalled()
  })
})
