// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
      notes: [],
      upsertNote: vi.fn(),
      importNotes: vi.fn(),
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

  it('shows the existing note text for the viewed day', () => {
    schoolState.notes = [
      { id: 'n1', date: '2026-07-08', subjectId: null, text: 'เรียนถึงเรื่องอนุกรมแล้ว', createdAt: 1, updatedAt: 1 },
    ]
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    expect(screen.getByLabelText('Notebook').value).toBe('เรียนถึงเรื่องอนุกรมแล้ว')
  })

  it('editing the notebook and blurring saves it via upsertNote', () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    const textarea = screen.getByLabelText('Notebook')
    fireEvent.change(textarea, { target: { value: 'new note' } })
    fireEvent.blur(textarea)
    expect(schoolState.upsertNote).toHaveBeenCalledWith({ date: '2026-07-08', subjectId: null, text: 'new note' })
  })

  it('exporting the notebook triggers a file download', () => {
    const clickSpy = vi.fn()
    const fakeAnchor = { click: clickSpy, href: '', download: '' }
    const origCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag, ...args) => {
      if (tag === 'a') return fakeAnchor
      return origCreateElement(tag, ...args)
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    fireEvent.click(screen.getByLabelText('ส่งออก Notebook'))

    expect(clickSpy).toHaveBeenCalled()
    expect(fakeAnchor.download).toBe('notebook.json')
    createElementSpy.mockRestore()
  })

  it('importing a valid notebook file calls importNotes with the parsed entries', async () => {
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    const file = new File(
      [JSON.stringify({ version: 1, notes: [{ date: '2026-07-09', subjectId: null, text: 'imported' }] })],
      'notebook.json',
      { type: 'application/json' },
    )
    const input = screen.getByLabelText('เลือกไฟล์ Notebook')
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(schoolState.importNotes).toHaveBeenCalledWith([{ date: '2026-07-09', subjectId: null, text: 'imported' }])
    })
  })

  it('importing an invalid notebook file alerts instead of throwing', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    const file = new File(['not json'], 'bad.json', { type: 'application/json' })
    const input = screen.getByLabelText('เลือกไฟล์ Notebook')
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled()
    })
    expect(schoolState.importNotes).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('renders a TCAS appointment with the calendar icon and no subject line', () => {
    schoolState.appointments = [
      { id: 't1', subjectId: null, title: 'ลงทะเบียน myTCAS', kind: 'tcas', dueDate: '2026-07-08', completed: false, createdAt: 1, completedAt: null },
    ]
    render(<SchoolPanel onClose={vi.fn()} onOpenSubject={vi.fn()} initialDate="2026-07-08" />)
    const item = screen.getByTestId('school-appointment-item')
    expect(item.textContent).toContain('ลงทะเบียน myTCAS')
    expect(item.querySelector('.lucide-calendar-days')).toBeTruthy()
  })
})
