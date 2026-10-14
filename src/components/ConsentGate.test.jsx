// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const signOut = vi.fn()
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel({ user: { uid: 'u1' }, signOut }) }))
const recordConsent = vi.fn()
vi.mock('../services/consent', () => ({ recordConsent: (...a) => recordConsent(...a) }))
vi.mock('./DeleteAccountSheet', () => ({ default: () => <div data-testid="delete-sheet" /> }))

const { default: ConsentGate } = await import('./ConsentGate')

const accept = () => screen.getByRole('button', { name: /ยอมรับและใช้งานต่อ|กำลังบันทึก/ })

beforeEach(() => { recordConsent.mockReset(); signOut.mockReset() })
afterEach(cleanup)

describe('ConsentGate', () => {
  it('is a modal dialog that links to both documents (opening in a new tab)', () => {
    render(<ConsentGate />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    const hrefs = screen.getAllByRole('link').map((a) => [a.getAttribute('href'), a.getAttribute('target')])
    expect(hrefs).toEqual([['/terms', '_blank'], ['/privacy', '_blank']])
  })

  it('needs BOTH confirmations before accept enables', () => {
    render(<ConsentGate />)
    const [terms, age] = screen.getAllByRole('checkbox')
    expect(accept().disabled).toBe(true)
    fireEvent.click(terms)
    expect(accept().disabled).toBe(true)
    fireEvent.click(age)
    expect(accept().disabled).toBe(false)
    fireEvent.click(terms)
    expect(accept().disabled).toBe(true)
  })

  it('accepting records consent for the signed-in user', async () => {
    recordConsent.mockResolvedValue()
    render(<ConsentGate />)
    screen.getAllByRole('checkbox').forEach((c) => fireEvent.click(c))
    fireEvent.click(accept())
    await waitFor(() => expect(recordConsent).toHaveBeenCalledWith('u1'))
  })

  it('a failed save shows an error and lets the student retry', async () => {
    recordConsent.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ConsentGate />)
    screen.getAllByRole('checkbox').forEach((c) => fireEvent.click(c))
    fireEvent.click(accept())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('บันทึกไม่สำเร็จ'))
    expect(accept().disabled).toBe(false)
  })

  it('offers a way out that does not accept: sign out, or delete the account', () => {
    render(<ConsentGate />)
    fireEvent.click(screen.getByText('ออกจากระบบ'))
    expect(signOut).toHaveBeenCalled()
    fireEvent.click(screen.getByText(/ไม่ยอมรับ ลบบัญชีของฉัน/))
    expect(screen.getByTestId('delete-sheet')).toBeTruthy()
    expect(recordConsent).not.toHaveBeenCalled()
  })
})
