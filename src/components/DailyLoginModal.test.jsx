// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const addDailyFeel = vi.fn()
let userState
vi.mock('../stores/useUserStore', () => ({
  useUserStore: (sel) => sel(userState),
}))

const upsertNote = vi.fn()
let schoolState
vi.mock('../stores/useSchoolStore', () => ({
  useSchoolStore: (sel) => sel(schoolState),
}))

vi.mock('./MoodHeatmap', () => ({ default: () => <div data-testid="heatmap" /> }))
vi.mock('./ui/Popup', () => ({ default: ({ children }) => <div>{children}</div> }))

const { default: DailyLoginModal } = await import('./DailyLoginModal')

describe('DailyLoginModal motivation screen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addDailyFeel.mockReturnValue({ streak: 3, changed: true, broken: false })
    userState = { addDailyFeel, feelingNotes: [], totalStacks: 5 }
    schoolState = { notes: [], upsertNote }
  })

  function checkIn() {
    render(<DailyLoginModal onClose={vi.fn()} today="2026-07-09" />)
    fireEvent.click(screen.getByText('Good'))
    fireEvent.click(screen.getByText(/Check In as/))
  }

  it('shows the N Day streak after checking in', () => {
    checkIn()
    expect(screen.getByText('3 Day')).toBeTruthy()
  })

  it('lights cyclePosition dots in the 5-dot cycle', () => {
    checkIn()
    const dots = screen.getAllByTestId('streak-dot')
    expect(dots).toHaveLength(5)
    expect(dots.filter((d) => d.dataset.lit === 'true')).toHaveLength(3)
  })

  it('shows the gentle-restart message when the streak broke', () => {
    addDailyFeel.mockReturnValue({ streak: 1, changed: true, broken: true })
    checkIn()
    expect(screen.getByText(/เริ่มใหม่/)).toBeTruthy()
  })

  it('saving a reflection appends it to today’s Notebook note', () => {
    schoolState.notes = [
      { id: 'n1', date: '2026-07-09', subjectId: null, text: 'เรียนอนุกรม', createdAt: 1, updatedAt: 1 },
    ]
    checkIn()
    fireEvent.change(screen.getByLabelText('บันทึกความรู้สึก'), { target: { value: 'วันนี้สู้มาก' } })
    fireEvent.click(screen.getByText('Save'))
    expect(upsertNote).toHaveBeenCalledWith({
      date: '2026-07-09', subjectId: null, text: 'เรียนอนุกรม\n🔥 Day 3: วันนี้สู้มาก',
    })
  })

  it('saving with no existing note writes just the reflection line', () => {
    checkIn()
    fireEvent.change(screen.getByLabelText('บันทึกความรู้สึก'), { target: { value: 'เหนื่อยแต่ไหว' } })
    fireEvent.click(screen.getByText('Save'))
    expect(upsertNote).toHaveBeenCalledWith({
      date: '2026-07-09', subjectId: null, text: '🔥 Day 3: เหนื่อยแต่ไหว',
    })
  })
})
