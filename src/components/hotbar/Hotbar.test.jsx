// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const auth = vi.hoisted(() => ({ user: { uid: 'u1' } }))
vi.mock('../../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(auth) }))
vi.mock('../../services/focus', () => ({
  startFocus: vi.fn(), checkInFocus: vi.fn(), endFocus: vi.fn(), abandonFocus: vi.fn(), CHECKIN_PROMPT_MS: 1500000,
}))

const { default: Hotbar } = await import('./Hotbar')
const { dueTodayCount, localToday } = await import('../../lib/hotbarBadges')
const { useHotbarStore } = await import('../../stores/useHotbarStore')
const { useRoomUiStore } = await import('../../stores/useRoomUiStore')
const { useFocusStore } = await import('../../stores/useFocusStore')
const { useTaskStore } = await import('../../stores/useTaskStore')
const { useFxStore } = await import('../../stores/useFxStore')
const { usePopupStore } = await import('../../stores/usePopupStore')

const makeCtx = () => ({ activeView: 'home', openView: vi.fn(), openPopup: vi.fn(), openSheet: vi.fn(), openAdminChat: vi.fn(), closeTopPopup: vi.fn() })

beforeEach(() => {
  auth.user = { uid: 'u1' }
  useHotbarStore.getState().reset()
  useRoomUiStore.setState({ sheet: null })
  useFocusStore.getState().reset()
  useTaskStore.setState({ tasks: [] })
  usePopupStore.setState({ activePopup: null })
})

describe('Hotbar', () => {
  it('renders seven slots and the bag with Thai labels', () => {
    render(<Hotbar ctx={makeCtx()} />)
    for (const name of ['โฟกัส', 'วาร์ป', 'แผน TCAS', 'งาน', 'แชท', 'ร้านค้า', 'โปรไฟล์', 'กระเป๋า']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    expect(screen.getAllByRole('button')).toHaveLength(8)
  })

  it('opens a view, a sheet and a popup from the registry targets', () => {
    const ctx = makeCtx()
    render(<Hotbar ctx={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: 'งาน' }))
    expect(ctx.openView).toHaveBeenCalledWith('task')
    fireEvent.click(screen.getByRole('button', { name: 'ร้านค้า' }))
    expect(ctx.openSheet).toHaveBeenCalledWith('shop')
    fireEvent.click(screen.getByRole('button', { name: 'กระเป๋า' }))
    expect(ctx.openSheet).toHaveBeenCalledWith('bag')
  })

  it('keys 1-7 use the slot and b opens the bag', () => {
    const ctx = makeCtx()
    render(<Hotbar ctx={ctx} />)
    fireEvent.keyDown(window, { key: '4' })
    expect(ctx.openView).toHaveBeenCalledWith('task')
    fireEvent.keyDown(window, { key: '2' })
    expect(ctx.openSheet).toHaveBeenCalledWith('warp')
    fireEvent.keyDown(window, { key: 'b' })
    expect(ctx.openSheet).toHaveBeenCalledWith('bag')
  })

  it('ignores keys while typing in a field or with a modifier held', () => {
    const ctx = makeCtx()
    render(<><input aria-label="ช่องพิมพ์" /><Hotbar ctx={ctx} /></>)
    fireEvent.keyDown(screen.getByLabelText('ช่องพิมพ์'), { key: '4' })
    fireEvent.keyDown(window, { key: '4', ctrlKey: true })
    expect(ctx.openView).not.toHaveBeenCalled()
  })

  it('Escape closes the open sheet first, then hands the popup to its own close logic', () => {
    const ctx = makeCtx()
    render(<Hotbar ctx={ctx} />)
    useRoomUiStore.setState({ sheet: 'shop' })
    usePopupStore.setState({ activePopup: 'calendar' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useRoomUiStore.getState().sheet).toBeNull()
    expect(ctx.closeTopPopup).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(ctx.closeTopPopup).toHaveBeenCalledTimes(1)
  })

  it('Escape does nothing with no sheet and no popup open', () => {
    const ctx = makeCtx()
    render(<Hotbar ctx={ctx} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(ctx.closeTopPopup).not.toHaveBeenCalled()
  })

  it('a Bag-only item put on the bar still works there: guide replays, contact-developer opens the chat', async () => {
    const { useGuideStore } = await import('../../stores/useGuideStore')
    const replay = vi.spyOn(useGuideStore.getState(), 'replay').mockImplementation(() => {})
    useHotbarStore.setState({ slots: ['guide', 'warp', 'adminChat', 'tasks', 'letter', 'shop', 'wardrobe'] })
    const ctx = makeCtx()
    render(<Hotbar ctx={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: 'คู่มือ' }))
    expect(replay).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'ติดต่อผู้พัฒนา' }))
    expect(ctx.openAdminChat).toHaveBeenCalled()
    expect(ctx.openSheet).not.toHaveBeenCalled()
    replay.mockRestore()
  })

  it('shows the number of tasks due today on the tasks slot only', () => {
    useTaskStore.setState({ tasks: [
      { id: 'a', completed: false, scheduledDate: localToday() },
      { id: 'b', completed: true, scheduledDate: localToday() },
      { id: 'c', completed: false, scheduledDate: '2001-01-01' },
    ] })
    render(<Hotbar ctx={makeCtx()} />)
    expect(screen.getByRole('button', { name: 'งาน' }).textContent).toBe('41') // hotkey 4 + badge 1
    expect(screen.getByRole('button', { name: 'ร้านค้า' }).textContent).toBe('6') // hotkey only
  })

  it('tells a guest that focus and the shop need an account', () => {
    auth.user = null
    const ctx = makeCtx()
    const push = vi.spyOn(useFxStore.getState(), 'push')
    render(<Hotbar ctx={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: 'โฟกัส' }))
    expect(ctx.openSheet).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalled()
  })

  it('does not reopen the focus setup while a session is running', () => {
    useFocusStore.setState({ status: 'running' })
    const ctx = makeCtx()
    render(<Hotbar ctx={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: 'โฟกัส' }))
    expect(ctx.openSheet).not.toHaveBeenCalled()
  })

  it('follows a customised bar order', () => {
    useHotbarStore.getState().swap(0, 3)
    render(<Hotbar ctx={makeCtx()} />)
    const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(labels[0]).toBe('งาน')
    expect(labels[3]).toBe('โฟกัส')
  })
})

describe('dueTodayCount', () => {
  it('counts unfinished tasks scheduled for the day', () => {
    expect(dueTodayCount([{ completed: false, scheduledDate: 'd' }, { completed: true, scheduledDate: 'd' }], 'd')).toBe(1)
    expect(dueTodayCount(undefined, 'd')).toBe(0)
  })
})
