// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({ warpTo: vi.fn(), auth: { user: { uid: 'u1' } } }))
vi.mock('../../services/warp', () => ({ warpTo: (...a) => m.warpTo(...a) }))
vi.mock('../../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(m.auth) }))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: WarpSheet } = await import('./WarpSheet')
const { useWorldStore } = await import('../../stores/useWorldStore')
const { useResumeStore } = await import('../../stores/useResumeStore')
const { useSchoolWorldStore } = await import('../../stores/useSchoolWorldStore')

beforeEach(() => {
  vi.clearAllMocks()
  m.auth.user = { uid: 'u1' }
  m.warpTo.mockResolvedValue({ ok: true })
  useWorldStore.setState({ currentMapKey: 'room' })
  useSchoolWorldStore.setState({ inHub: false })
  useResumeStore.getState().reset()
})

describe('WarpSheet', () => {
  it('lists the room and the school (no campus map exists yet)', () => {
    render(<WarpSheet onClose={() => {}} />)
    expect(screen.getByText('ห้องของฉัน')).toBeTruthy()
    expect(screen.getByText('โรงเรียน (School Hub)')).toBeTruthy()
    expect(screen.queryByText(/Open House/)).toBeNull()
  })

  it('marks where the player is and disables resuming there', () => {
    render(<WarpSheet onClose={() => {}} />)
    expect(screen.getByText('ที่นี่')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'ไปต่อ' }).disabled).toBe(true)
  })

  it('shows the last place label for somewhere else', () => {
    useWorldStore.setState({ currentMapKey: 'school_hub' })
    useResumeStore.getState().record('room', { x: 1, y: 1, facing: 'down', label: 'ที่โต๊ะ' })
    render(<WarpSheet onClose={() => {}} />)
    expect(screen.getByText('ล่าสุด: ที่โต๊ะ')).toBeTruthy()
  })

  it('ไปต่อ resumes, ไปจุดเริ่มต้น does not, and the sheet closes on success', async () => {
    useWorldStore.setState({ currentMapKey: 'school_hub' })
    const onClose = vi.fn()
    render(<WarpSheet onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'ไปต่อ' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(m.warpTo).toHaveBeenCalledWith('room', { resume: true })
    fireEvent.click(screen.getByRole('button', { name: 'ไปจุดเริ่มต้น' }))
    expect(m.warpTo).toHaveBeenLastCalledWith('room', { resume: false })
  })

  it('shows the reason when the school cannot be entered and stays open', async () => {
    m.warpTo.mockResolvedValue({ ok: false, error: 'NO_SCHOOL' })
    const onClose = vi.fn()
    render(<WarpSheet onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'เข้าโรงเรียน' }))
    expect((await screen.findByRole('alert')).textContent).toContain('เลือกโรงเรียน')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('a guest only sees the room', () => {
    m.auth.user = null
    render(<WarpSheet onClose={() => {}} />)
    expect(screen.queryByText('โรงเรียน (School Hub)')).toBeNull()
  })
})
