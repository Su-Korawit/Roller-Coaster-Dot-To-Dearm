// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let schoolState
vi.mock('../../stores/useSchoolStore', () => ({
  useSchoolStore: (sel) => sel(schoolState),
}))

const addCoins = vi.fn()
vi.mock('../../stores/useUserStore', () => ({
  useUserStore: (sel) => sel({ addCoins }),
}))

const { default: SchoolPanel } = await import('./SchoolPanel')

describe('SchoolPanel', () => {
  beforeEach(() => {
    addCoins.mockClear()
    schoolState = {
      subjects: [
        { id: 'math', name: 'Math', color: '#a78bda', description: '' },
        { id: 'physics', name: 'Physics', color: '#7c3aed', description: '' },
      ],
      scheduleSlots: [],
      appointments: [
        { id: 'a1', subjectId: 'math', title: '1.1.3 Page 21', kind: 'homework', dueDate: '2026-07-08', completed: false, createdAt: 100, completedAt: null },
        { id: 'a2', subjectId: 'math', title: 'สอบเก็บคะแนน 1.1.1-2', kind: 'checkpoint', dueDate: '2026-07-08', completed: false, createdAt: 50, completedAt: null },
      ],
      toggleAppointment: vi.fn(),
      addSubject: vi.fn(),
    }
  })

  it('lists all subjects in the rail', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    expect(screen.getByText('Math')).toBeTruthy()
    expect(screen.getByText('Physics')).toBeTruthy()
  })

  it('shows appointments due on the current day, sorted incomplete-first', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    const items = screen.getAllByTestId('school-appointment-item')
    expect(items.map((el) => el.textContent)).toEqual([
      expect.stringContaining('สอบเก็บคะแนน 1.1.1-2'),
      expect.stringContaining('1.1.3 Page 21'),
    ])
  })

  it('tapping a subject calls onOpenSubject with its id', () => {
    const onOpenSubject = vi.fn()
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={onOpenSubject} initialDate="2026-07-08" />)
    fireEvent.click(screen.getByText('Math'))
    expect(onOpenSubject).toHaveBeenCalledWith('math')
  })

  it('completing an appointment awards coins and toggles it', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    const [firstCheckbox] = screen.getAllByRole('checkbox')
    fireEvent.click(firstCheckbox)
    expect(addCoins).toHaveBeenCalledWith(5)
    expect(schoolState.toggleAppointment).toHaveBeenCalled()
  })

  it('advancing to the next day changes which appointments show', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    fireEvent.click(screen.getByLabelText('วันถัดไป'))
    expect(screen.queryByText(/1\.1\.3 Page 21/)).toBeNull()
  })

  it('marks an overdue incomplete appointment as overdue', () => {
    schoolState.appointments = [
      { id: 'a3', subjectId: 'math', title: 'Late homework', kind: 'homework', dueDate: '2026-07-05', completed: false, createdAt: 10, completedAt: null },
    ]
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-05" today="2026-07-08" />)
    expect(screen.getByTestId('school-appointment-item').className).toContain('school-overdue')
  })

  it('does not mark an appointment overdue when viewed date equals today', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" today="2026-07-08" />)
    const items = screen.getAllByTestId('school-appointment-item')
    expect(items.every((el) => !el.className.includes('school-overdue'))).toBe(true)
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<SchoolPanel onClose={onClose} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    fireEvent.click(screen.getByLabelText('ปิด'))
    expect(onClose).toHaveBeenCalled()
  })
})
