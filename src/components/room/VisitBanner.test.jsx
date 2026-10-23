// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const m = vi.hoisted(() => ({ leaveVisit: vi.fn() }))
vi.mock('../../services/visitRoom', () => ({ leaveVisit: (...a) => m.leaveVisit(...a), visitRoom: vi.fn() }))

vi.mock('./FocusSetupSheet', () => ({ default: () => <div>focus-sheet</div> }))
vi.mock('./ShopSheet', () => ({ default: () => <div>shop-sheet</div> }))
vi.mock('./FocusHud', () => ({ default: () => <div>focus-hud</div> }))
vi.mock('./FocusCompleteScreen', () => ({ default: () => <div>complete-screen</div> }))
vi.mock('./DecorateBar', () => ({ default: () => <div>decorate-bar</div> }))
vi.mock('./WardrobeSheet', () => ({ default: () => <div>wardrobe-sheet</div> }))
vi.mock('./TreeHistorySheet', () => ({ default: () => <div>history-sheet</div> }))
vi.mock('../hotbar/WarpSheet', () => ({ default: () => <div>warp-sheet</div> }))
vi.mock('../plan/PlanSheet', () => ({ default: () => <div>plan-sheet</div> }))
vi.mock('../plan/RoundPickerSheet', () => ({ default: () => <div>picker</div> }))
vi.mock('../../stores/useFocusStore', () => ({ useFocusStore: (sel) => sel({ status: 'idle' }) }))
vi.mock('../../stores/useRoomStore', () => ({ roomSync: {} }))
vi.mock('../../lib/roomSync', () => ({ flushOnLeave: () => () => {} }))

const { default: RoomLayer } = await import('./RoomLayer')
const { useVisitStore } = await import('../../stores/useVisitStore')
const { useRoomUiStore } = await import('../../stores/useRoomUiStore')

beforeEach(() => {
  vi.clearAllMocks()
  useVisitStore.getState().end()
  useRoomUiStore.setState({ sheet: null })
})

describe('RoomLayer while visiting a friend', () => {
  it('shows nothing about visiting at home, and the decorate bar is there', () => {
    render(<RoomLayer />)
    expect(screen.queryByText('กำลังเยี่ยมห้องของเพื่อน')).toBeNull()
    expect(screen.getByText('decorate-bar')).toBeTruthy()
  })

  it('shows the visit banner with the way home, and no decorate bar', () => {
    useVisitStore.getState().begin({ ownerUid: 'f1', layout: { tier: 0, theme: 'minimal', petId: null, placed: [] } })
    render(<RoomLayer />)
    expect(screen.getByText('กำลังเยี่ยมห้องของเพื่อน')).toBeTruthy()
    expect(screen.queryByText('decorate-bar')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'กลับห้องของฉัน' }))
    expect(m.leaveVisit).toHaveBeenCalledTimes(1)
  })
})
