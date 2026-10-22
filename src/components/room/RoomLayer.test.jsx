// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('./FocusSetupSheet', () => ({ default: () => <div>focus-sheet</div> }))
vi.mock('./ShopSheet', () => ({ default: () => <div>shop-sheet</div> }))
vi.mock('./FocusHud', () => ({ default: () => <div>focus-hud</div> }))
vi.mock('./FocusCompleteScreen', () => ({ default: () => <div>complete-screen</div> }))
vi.mock('./DecorateBar', () => ({ default: () => <div>decorate-bar</div> }))
vi.mock('../../stores/useFocusStore', () => ({
  useFocusStore: (sel) => sel(focus),
}))
const focus = { status: 'idle' }

const { default: RoomLayer } = await import('./RoomLayer')
const { useRoomUiStore } = await import('../../stores/useRoomUiStore')

beforeEach(() => {
  focus.status = 'idle'
  useRoomUiStore.setState({ sheet: null })
})

describe('RoomLayer', () => {
  it('has no temporary entry buttons any more (the hotbar opens the sheets)', () => {
    render(<RoomLayer />)
    expect(screen.queryByRole('button', { name: 'โฟกัส' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'ร้านค้า' })).toBeNull()
  })

  it('shows the focus sheet when the hotbar asks for it', () => {
    useRoomUiStore.setState({ sheet: 'focus' })
    render(<RoomLayer />)
    expect(screen.getByText('focus-sheet')).toBeTruthy()
    useRoomUiStore.getState().close()
  })

  it('shows the shop sheet when asked', () => {
    useRoomUiStore.setState({ sheet: 'shop' })
    render(<RoomLayer />)
    expect(screen.getByText('shop-sheet')).toBeTruthy()
  })

  it('does not open the focus setup while a session is running', () => {
    focus.status = 'running'
    useRoomUiStore.setState({ sheet: 'focus' })
    render(<RoomLayer />)
    expect(screen.queryByText('focus-sheet')).toBeNull()
  })

  it('always mounts the HUD, the decorate bar and the completion screen', () => {
    render(<RoomLayer />)
    expect(screen.getByText('focus-hud')).toBeTruthy()
    expect(screen.getByText('decorate-bar')).toBeTruthy()
    expect(screen.getByText('complete-screen')).toBeTruthy()
  })
})
