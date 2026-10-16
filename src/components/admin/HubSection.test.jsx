// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  call: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('firebase/firestore', () => ({
  getDoc: (...a) => m.getDoc(...a),
  setDoc: (...a) => m.setDoc(...a),
}))
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (_f, name) => (data) => m.call(name, data),
}))
vi.mock('../../lib/db', () => ({ refs: { siteConfigHub: () => ({ path: 'siteConfig/hub' }) } }))
vi.mock('./Toast', () => ({ useToast: () => m.toast }))

const { default: HubSection } = await import('./HubSection')

const existing = (data) => ({ exists: () => data != null, data: () => data })

beforeEach(() => {
  vi.clearAllMocks()
  m.getDoc.mockResolvedValue(existing({ lineOpenChatUrl: 'https://line.me/ti/g2/old', lineRules: 'กติกาเดิม', openHouseEnabled: false }))
  m.setDoc.mockResolvedValue(undefined)
})

const urlField = () => screen.findByLabelText('ลิงก์ LINE OpenChat')

describe('HubSection settings', () => {
  it('shows the saved settings', async () => {
    render(<HubSection />)
    expect((await urlField()).value).toBe('https://line.me/ti/g2/old')
    expect(screen.getByLabelText('กติกาห้อง').value).toBe('กติกาเดิม')
  })

  it('rejects an OpenChat link that is not on line.me', async () => {
    render(<HubSection />)
    fireEvent.change(await urlField(), { target: { value: 'http://example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการตั้งค่า' }))
    expect(await screen.findByText('ลิงก์ต้องขึ้นต้นด้วย https://line.me/')).toBeTruthy()
    expect(m.setDoc).not.toHaveBeenCalled()
  })

  it('rejects a look-alike host', async () => {
    render(<HubSection />)
    fireEvent.change(await urlField(), { target: { value: 'https://line.me.evil.test/x' } })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการตั้งค่า' }))
    expect(await screen.findByText('ลิงก์ต้องขึ้นต้นด้วย https://line.me/')).toBeTruthy()
    expect(m.setDoc).not.toHaveBeenCalled()
  })

  it('accepts an empty link and a line.me link, merging into the config document', async () => {
    render(<HubSection />)
    fireEvent.change(await urlField(), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการตั้งค่า' }))
    await waitFor(() => expect(m.setDoc).toHaveBeenCalledTimes(1))
    expect(m.setDoc.mock.calls[0][1]).toMatchObject({ lineOpenChatUrl: '' })
    expect(m.setDoc.mock.calls[0][2]).toEqual({ merge: true })

    fireEvent.change(screen.getByLabelText('ลิงก์ LINE OpenChat'), { target: { value: 'https://line.me/ti/g2/abc' } })
    fireEvent.change(screen.getByLabelText('บทความเด่น (slug)'), { target: { value: 'medicine-all' } })
    fireEvent.click(screen.getByLabelText('เปิดแผนที่ Open House'))
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการตั้งค่า' }))
    await waitFor(() => expect(m.setDoc).toHaveBeenCalledTimes(2))
    expect(m.setDoc.mock.calls[1][1]).toEqual({
      lineOpenChatUrl: 'https://line.me/ti/g2/abc',
      lineRules: 'กติกาเดิม',
      lineModerators: '',
      featuredSlug: 'medicine-all',
      openHouseEnabled: true,
    })
    expect(m.toast.success).toHaveBeenCalled()
  })

  it('reports a failed save', async () => {
    m.setDoc.mockRejectedValue(new Error('denied'))
    render(<HubSection />)
    await urlField()
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการตั้งค่า' }))
    await waitFor(() => expect(m.toast.error).toHaveBeenCalled())
  })

  it('starts from empty settings when none are saved yet', async () => {
    m.getDoc.mockResolvedValue(existing(null))
    render(<HubSection />)
    expect((await urlField()).value).toBe('')
  })
})

describe('HubSection creator access', () => {
  it('grants by email', async () => {
    m.call.mockResolvedValue({ data: { ok: true, uid: 'u9', creator: true } })
    render(<HubSection />)
    fireEvent.change(await screen.findByLabelText('อีเมลผู้เขียน'), { target: { value: ' Writer@Example.test ' } })
    fireEvent.click(screen.getByRole('button', { name: 'ให้สิทธิ์' }))
    await waitFor(() => expect(m.call).toHaveBeenCalledWith('grantCreatorRole', { email: 'Writer@Example.test' }))
    expect(await screen.findByText('ให้สิทธิ์เขียนบทความแล้ว (ผู้ใช้ต้องกดรีเฟรชสิทธิ์ในสตูดิโอ หรือเข้าสู่ระบบใหม่)')).toBeTruthy()
  })

  it('revokes by email', async () => {
    m.call.mockResolvedValue({ data: { ok: true, uid: 'u9', creator: false } })
    render(<HubSection />)
    fireEvent.change(await screen.findByLabelText('อีเมลผู้เขียน'), { target: { value: 'writer@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'เพิกถอน' }))
    await waitFor(() => expect(m.call).toHaveBeenCalledWith('grantCreatorRole', { email: 'writer@example.test', revoke: true }))
    expect(await screen.findByText('เพิกถอนสิทธิ์เขียนบทความแล้ว')).toBeTruthy()
  })

  it('needs an email before calling the server', async () => {
    render(<HubSection />)
    fireEvent.click(await screen.findByRole('button', { name: 'ให้สิทธิ์' }))
    expect(m.call).not.toHaveBeenCalled()
    expect(await screen.findByText('ใส่อีเมลก่อน')).toBeTruthy()
  })

  it('explains an unknown account in Thai', async () => {
    m.call.mockRejectedValue(Object.assign(new Error('x'), { code: 'functions/not-found' }))
    render(<HubSection />)
    fireEvent.change(await screen.findByLabelText('อีเมลผู้เขียน'), { target: { value: 'nobody@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'ให้สิทธิ์' }))
    expect(await screen.findByText('ไม่พบบัญชีที่ใช้อีเมลนี้ ผู้เขียนต้องสมัครในแอปก่อน')).toBeTruthy()
  })
})
