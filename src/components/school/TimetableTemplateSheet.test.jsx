// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let templatesState
vi.mock('../../stores/useTimetableTemplatesStore', () => ({
  useTimetableTemplatesStore: Object.assign((sel) => sel(templatesState), {
    getState: () => templatesState,
  }),
}))

const importTimetable = vi.fn(() => ({ added: 2, skipped: 0 }))
vi.mock('../../stores/useSchoolStore', () => ({
  useSchoolStore: Object.assign((sel) => sel({ importTimetable }), {
    getState: () => ({ importTimetable }),
  }),
}))

let authState
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

vi.mock('../ui/Popup', () => ({
  default: ({ children, onClose }) => <div data-testid="popup">{children}<button onClick={onClose}>__close__</button></div>,
}))

const { default: TimetableTemplateSheet } = await import('./TimetableTemplateSheet')

const TEMPLATES = [
  { id: 't1', version: 1, name: 'ม.5/1 สายวิทย์', schoolName: 'สวนกุหลาบวิทยาลัย', classLevel: 'ม.5', createdBy: 'u9',
    subjects: [{ name: 'Math', color: '#a78bda', slots: [] }] },
  { id: 't2', version: 1, name: 'ม.4/2', schoolName: 'เตรียมอุดม', classLevel: 'ม.4', createdBy: 'me',
    subjects: [] },
]

describe('TimetableTemplateSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState = { user: { uid: 'me' } }
    templatesState = {
      templates: TEMPLATES,
      loading: false,
      loadLatest: vi.fn(),
      searchBySchool: vi.fn(),
      publishTemplate: vi.fn().mockResolvedValue(undefined),
      deleteTemplate: vi.fn(),
    }
  })

  it('loads the latest templates on mount and lists them', () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    expect(templatesState.loadLatest).toHaveBeenCalled()
    expect(screen.getByText('ม.5/1 สายวิทย์')).toBeTruthy()
    expect(screen.getByText('ม.4/2')).toBeTruthy()
  })

  it('searching submits the school-name term', () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('ค้นหาโรงเรียน'), { target: { value: 'สวน' } })
    fireEvent.click(screen.getByLabelText('ค้นหา'))
    expect(templatesState.searchBySchool).toHaveBeenCalledWith('สวน')
  })

  it('a class-level chip filters the list client-side', () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('ม.5'))
    expect(screen.getByText('ม.5/1 สายวิทย์')).toBeTruthy()
    expect(screen.queryByText('ม.4/2')).toBeNull()
  })

  it('ใช้ตารางนี้ imports the template and reports the result', () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    fireEvent.click(screen.getAllByText('ใช้ตารางนี้')[0])
    expect(importTimetable).toHaveBeenCalledWith([{ name: 'Math', color: '#a78bda', slots: [] }])
    expect(screen.getByText(/เพิ่ม 2 วิชา/)).toBeTruthy()
  })

  it('shows delete only on my own template', () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    expect(screen.getAllByLabelText('ลบตาราง')).toHaveLength(1)
    fireEvent.click(screen.getByLabelText('ลบตาราง'))
    expect(templatesState.deleteTemplate).toHaveBeenCalledWith('t2')
  })

  it('publish form submits my timetable with metadata', async () => {
    render(<TimetableTemplateSheet onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('แชร์ตารางเรียนของฉัน'))
    fireEvent.change(screen.getByLabelText('ชื่อตาราง'), { target: { value: 'ห้อง 6/3' } })
    fireEvent.change(screen.getByLabelText('ชื่อโรงเรียน'), { target: { value: 'หาดใหญ่วิทยาลัย' } })
    fireEvent.change(screen.getByLabelText('ระดับชั้น'), { target: { value: 'ม.6' } })
    fireEvent.click(screen.getByText('เผยแพร่'))
    expect(templatesState.publishTemplate).toHaveBeenCalledWith({
      name: 'ห้อง 6/3', schoolName: 'หาดใหญ่วิทยาลัย', classLevel: 'ม.6',
    })
  })
})
