// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let schoolState
vi.mock('../../stores/useSchoolStore', () => ({
  useSchoolStore: (sel) => sel(schoolState),
}))

const { default: SubjectDetailPanel } = await import('./SubjectDetailPanel')

describe('SubjectDetailPanel', () => {
  beforeEach(() => {
    schoolState = {
      subjects: [{ id: 'math', name: 'Math', color: '#a78bda', description: '' }],
      scheduleSlots: [
        { id: 'slot1', subjectId: 'math', day: 'mon', startTime: '12:00', endTime: '13:00' },
        { id: 'slot2', subjectId: 'math', day: 'thu', startTime: '12:00', endTime: '13:00' },
      ],
      appointments: [
        { id: 'a1', subjectId: 'math', title: '1.1.3 Page 21', kind: 'homework', dueDate: '2026-07-10', completed: false, createdAt: 100, completedAt: null },
      ],
      addScheduleSlot: vi.fn(),
      removeScheduleSlot: vi.fn(),
      addAppointment: vi.fn(),
      removeAppointment: vi.fn(),
      toggleAppointment: vi.fn(),
      updateSubject: vi.fn(),
      removeSubject: vi.fn(),
    }
  })

  it('renders the subject name in the editable title field', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    expect(screen.getByLabelText('ชื่อวิชา').value).toBe('Math')
  })

  it('renaming the subject calls updateSubject on blur', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    const input = screen.getByLabelText('ชื่อวิชา')
    fireEvent.change(input, { target: { value: 'Advanced Math' } })
    fireEvent.blur(input)
    expect(schoolState.updateSubject).toHaveBeenCalledWith('math', { name: 'Advanced Math' })
  })

  it('deleting the subject calls removeSubject and onClose', () => {
    const onClose = vi.fn()
    render(<SubjectDetailPanel subjectId="math" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('ลบวิชา'))
    expect(schoolState.removeSubject).toHaveBeenCalledWith('math')
    expect(onClose).toHaveBeenCalled()
  })

  it('lists the weekly schedule slots', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    expect(screen.getByText(/mon.*12:00.*13:00/i)).toBeTruthy()
    expect(screen.getByText(/thu.*12:00.*13:00/i)).toBeTruthy()
  })

  it('lists the subject appointments', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    expect(screen.getByText('1.1.3 Page 21')).toBeTruthy()
  })

  it('removing a schedule slot calls removeScheduleSlot with its id', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    const removeButtons = screen.getAllByLabelText('ลบคาบเรียน')
    fireEvent.click(removeButtons[0])
    expect(schoolState.removeScheduleSlot).toHaveBeenCalledWith('slot1')
  })

  it('adding a schedule slot fills in the form and calls addScheduleSlot', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('วัน'), { target: { value: 'wed' } })
    fireEvent.change(screen.getByLabelText('เวลาเริ่ม'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('เวลาสิ้นสุด'), { target: { value: '10:00' } })
    fireEvent.click(screen.getByText('เพิ่มคาบเรียน'))
    expect(schoolState.addScheduleSlot).toHaveBeenCalledWith('math', { day: 'wed', startTime: '09:00', endTime: '10:00' })
  })

  it('adding an appointment fills in the form and calls addAppointment', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('หัวข้องาน'), { target: { value: 'Page 30' } })
    fireEvent.change(screen.getByLabelText('กำหนดส่ง'), { target: { value: '2026-07-15' } })
    fireEvent.click(screen.getByText('เพิ่มงาน'))
    expect(schoolState.addAppointment).toHaveBeenCalledWith('math', { title: 'Page 30', kind: 'homework', dueDate: '2026-07-15' })
  })

  it('removing an appointment calls removeAppointment with its id', () => {
    render(<SubjectDetailPanel subjectId="math" onClose={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('ลบงาน'))
    expect(schoolState.removeAppointment).toHaveBeenCalledWith('a1')
  })
})
