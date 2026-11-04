// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const auth = vi.hoisted(() => ({ user: { uid: 'u1' } }))
vi.mock('../../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(auth) }))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))

const { default: BagSheet } = await import('./BagSheet')
const { useHotbarStore } = await import('../../stores/useHotbarStore')
const { useUserStore } = await import('../../stores/useUserStore')
const { ADMIN_UID } = await import('../../constants/admin')

const makeCtx = () => ({ openView: vi.fn(), openPopup: vi.fn(), openSheet: vi.fn(), openAdminChat: vi.fn() })

beforeEach(() => {
  auth.user = { uid: 'u1' }
  useHotbarStore.getState().reset()
  useUserStore.setState({ uiVisibility: { hotbar: true, newsButton: true, musicPill: true, contactFab: true } })
})

describe('BagSheet', () => {
  it('lists every tool the old menu had plus the hotbar items', () => {
    render(<BagSheet onClose={() => {}} ctx={makeCtx()} />)
    for (const label of ['ปฏิทิน', 'Mastery', 'Roadmap', 'ตารางเรียน', 'ข่าวสาร', 'เพลง', 'เพื่อน', 'ตั้งค่า', 'คู่มือ', 'โฟกัส', 'วาร์ป', 'ร้านค้า']) {
      expect(screen.getByText(label), label).toBeTruthy()
    }
    expect(screen.queryByText('แผน TCAS')).toBeNull() // not ready yet
  })

  it('using an item closes the bag first, then opens it', () => {
    const onClose = vi.fn()
    const ctx = makeCtx()
    render(<BagSheet onClose={onClose} ctx={ctx} />)
    fireEvent.click(screen.getByText('Mastery'))
    expect(onClose).toHaveBeenCalled()
    expect(ctx.openPopup).toHaveBeenCalledWith('mastery')
    fireEvent.click(screen.getByText('ปฏิทิน'))
    expect(ctx.openView).toHaveBeenCalledWith('planner_calendar')
  })

  it('puts a bag item into a slot by arming it, then choosing the slot (keyboard friendly)', () => {
    render(<BagSheet onClose={() => {}} ctx={makeCtx()} />)
    fireEvent.click(screen.getByRole('button', { name: 'ใส่ Mastery ในช่อง' }))
    fireEvent.click(screen.getByRole('button', { name: 'ช่อง 1: โฟกัส' }))
    expect(useHotbarStore.getState().slots[0]).toBe('mastery')
    expect(useHotbarStore.getState().slots).toContain('warp')
  })

  it('cannot replace warp with an item from the bag', () => {
    render(<BagSheet onClose={() => {}} ctx={makeCtx()} />)
    const before = useHotbarStore.getState().slots
    fireEvent.click(screen.getByRole('button', { name: 'ใส่ Mastery ในช่อง' }))
    fireEvent.click(screen.getByRole('button', { name: 'ช่อง 2: วาร์ป' }))
    expect(useHotbarStore.getState().slots).toEqual(before)
  })

  it('slot buttons do nothing until an item is armed', () => {
    render(<BagSheet onClose={() => {}} ctx={makeCtx()} />)
    expect(screen.getByRole('button', { name: 'ช่อง 1: โฟกัส' }).disabled).toBe(true)
  })

  it('hides news when its button is turned off in settings', () => {
    useUserStore.setState({ uiVisibility: { hotbar: true, newsButton: false, contactFab: true } })
    render(<BagSheet onClose={() => {}} ctx={makeCtx()} />)
    expect(screen.queryByText('ข่าวสาร')).toBeNull()
  })

  it('shows contact-developer only to a signed-in student who is not the admin', () => {
    const { unmount } = render(<BagSheet onClose={() => {}} ctx={makeCtx()} />)
    expect(screen.getByText('ติดต่อผู้พัฒนา')).toBeTruthy()
    unmount()
    auth.user = null
    const second = render(<BagSheet onClose={() => {}} ctx={makeCtx()} />)
    expect(screen.queryByText('ติดต่อผู้พัฒนา')).toBeNull()
    second.unmount()
    auth.user = { uid: ADMIN_UID }
    render(<BagSheet onClose={() => {}} ctx={makeCtx()} />)
    expect(screen.queryByText('ติดต่อผู้พัฒนา')).toBeNull()
  })

  it('marks news as new until it has been read', () => {
    render(<BagSheet onClose={() => {}} ctx={{ ...makeCtx(), newsUnread: true }} />)
    expect(screen.getByLabelText('ใหม่')).toBeTruthy()
  })

  it('contact-developer calls the admin chat opener', () => {
    const ctx = makeCtx()
    render(<BagSheet onClose={() => {}} ctx={ctx} />)
    fireEvent.click(screen.getByText('ติดต่อผู้พัฒนา'))
    expect(ctx.openAdminChat).toHaveBeenCalled()
  })
})
