// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

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
  const card = (name) => screen.getByText(name).closest('li')

  it('lists the room, the campus and the school', () => {
    render(<WarpSheet onClose={() => {}} />)
    expect(screen.getByText('ห้องของฉัน')).toBeTruthy()
    expect(screen.getByText('งานเปิดบ้าน (Open House)')).toBeTruthy()
    expect(screen.getByText('โรงเรียน (School Hub)')).toBeTruthy()
  })

  it('marks where the player is and disables resuming there', () => {
    render(<WarpSheet onClose={() => {}} />)
    expect(screen.getByText('ที่นี่')).toBeTruthy()
    expect(within(card('ห้องของฉัน')).getByRole('button', { name: 'ไปต่อ' }).disabled).toBe(true)
    expect(within(card('งานเปิดบ้าน (Open House)')).getByRole('button', { name: 'ไปต่อ' }).disabled).toBe(false)
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
    fireEvent.click(within(card('ห้องของฉัน')).getByRole('button', { name: 'ไปต่อ' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(m.warpTo).toHaveBeenCalledWith('room', { resume: true })
    fireEvent.click(within(card('ห้องของฉัน')).getByRole('button', { name: 'ไปจุดเริ่มต้น' }))
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

  it('on the campus it also lists the faculty buildings and walks to the door of the one tapped', async () => {
    const { useOpenHouseUiStore } = await import('../../stores/useOpenHouseUiStore')
    const { placementOf, doorTile } = await import('../../game/campusLayout')
    const walker = vi.fn()
    useOpenHouseUiStore.getState().setWalker(walker)
    useWorldStore.setState({ currentMapKey: 'campus' })
    const onClose = vi.fn()
    render(<WarpSheet onClose={onClose} />)
    const list = screen.getByRole('region', { name: 'ตึกคณะ' })
    expect(within(list).getAllByRole('button')).toHaveLength(18)
    fireEvent.click(within(list).getByRole('button', { name: 'วิศวกรรมศาสตร์' }))
    const d = doorTile(placementOf('eng'))
    expect(walker).toHaveBeenCalledWith(d.x, d.y)
    expect(onClose).toHaveBeenCalled()
    useOpenHouseUiStore.getState().setWalker(null)
  })

  it('elsewhere there is no building list', () => {
    render(<WarpSheet onClose={() => {}} />)
    expect(screen.queryByRole('region', { name: 'ตึกคณะ' })).toBeNull()
  })

  it('a guest only sees the room', () => {
    m.auth.user = null
    render(<WarpSheet onClose={() => {}} />)
    expect(screen.queryByText('โรงเรียน (School Hub)')).toBeNull()
  })
})
