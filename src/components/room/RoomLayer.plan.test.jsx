// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

vi.mock('./FocusSetupSheet', () => ({ default: () => <div>focus-sheet</div> }))
vi.mock('./ShopSheet', () => ({ default: () => <div>shop-sheet</div> }))
vi.mock('./FocusHud', () => ({ default: () => <div>focus-hud</div> }))
vi.mock('./FocusCompleteScreen', () => ({ default: () => <div>complete-screen</div> }))
vi.mock('./DecorateBar', () => ({ default: () => <div>decorate-bar</div> }))
vi.mock('../hotbar/WarpSheet', () => ({ default: () => <div>warp-sheet</div> }))
vi.mock('../plan/PlanSheet', () => ({ default: () => <div>plan-sheet</div> }))
vi.mock('../plan/RoundPickerSheet', () => ({ default: ({ program }) => <div>{`picker:${program.programId}`}</div> }))

const { default: RoomLayer } = await import('./RoomLayer')
const { useRoomUiStore } = await import('../../stores/useRoomUiStore')
const { usePlanUiStore } = await import('../../stores/usePlanUiStore')

beforeEach(() => {
  useRoomUiStore.getState().close()
  usePlanUiStore.getState().closeAdd()
})

describe('RoomLayer and the Plan', () => {
  it('shows the plan sheet when the hotbar opens it', () => {
    useRoomUiStore.setState({ sheet: 'plan' })
    render(<RoomLayer />)
    expect(screen.getByText('plan-sheet')).toBeTruthy()
  })

  it('shows the round picker whenever a program is being added, whatever sheet is open', () => {
    render(<RoomLayer />)
    expect(screen.queryByText(/^picker:/)).toBeNull()
    act(() => usePlanUiStore.getState().openAdd({ programId: 'p1', rounds: [] }))
    expect(screen.getByText('picker:p1')).toBeTruthy()
    act(() => usePlanUiStore.getState().closeAdd())
    expect(screen.queryByText(/^picker:/)).toBeNull()
  })
})
