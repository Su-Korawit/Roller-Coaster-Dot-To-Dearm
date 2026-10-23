// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('./StudygramCard', () => ({ default: ({ session }) => <div data-testid="card">{`${session.tree}|${session.mode}|${session.verifiedMs}`}</div> }))
vi.mock('../../lib/sfx', () => ({ playSound: vi.fn() }))
vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(), getDocs: vi.fn() }))
vi.mock('../../lib/db', () => ({ refs: {}, cols: {}, shapes: {} }))
vi.mock('../../services/focus', () => ({ startFocus: vi.fn(), checkInFocus: vi.fn(), endFocus: vi.fn(), abandonFocus: vi.fn(), CHECKIN_PROMPT_MS: 1 }))

const { default: FocusCompleteScreen } = await import('./FocusCompleteScreen')
const { useFocusStore } = await import('../../stores/useFocusStore')

const finish = (over = {}, status = 'done') => useFocusStore.setState({
  status,
  result: { tree: 'tree', leaves: 41, mode: 'strict', plannedMin: 50, verifiedMs: 50 * 60000, withered: false, practice: false, ...over },
})

beforeEach(() => useFocusStore.getState().reset())

describe('FocusCompleteScreen studygram button', () => {
  it('offers the card after a finished session and opens it with that session', () => {
    finish()
    render(<FocusCompleteScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'ทำการ์ดแชร์' }))
    expect(screen.getByTestId('card').textContent).toBe('tree|strict|3000000')
  })

  it('does not offer it for the practice session or a withered tree', () => {
    finish({ practice: true, leaves: 10 })
    const { unmount } = render(<FocusCompleteScreen />)
    expect(screen.queryByRole('button', { name: 'ทำการ์ดแชร์' })).toBeNull()
    unmount()
    finish({ withered: true, leaves: 0 }, 'withered')
    render(<FocusCompleteScreen />)
    expect(screen.queryByRole('button', { name: 'ทำการ์ดแชร์' })).toBeNull()
  })
})
