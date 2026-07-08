// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let eventsState
const subscribeEvents = vi.fn(() => () => {})
vi.mock('../stores/useTcasEventsStore', () => ({
  useTcasEventsStore: Object.assign((sel) => sel(eventsState), {
    getState: () => eventsState,
  }),
}))

const addAppointment = vi.fn()
vi.mock('../stores/useSchoolStore', () => ({
  useSchoolStore: Object.assign((sel) => sel({ addAppointment }), {
    getState: () => ({ addAppointment }),
  }),
}))

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

const { default: TcasCalendarTab } = await import('./TcasCalendarTab')

const EVENTS = [
  { id: 'e0', title: 'ประกาศ Blueprint', description: 'รายละเอียด blueprint', date: '2026-06-01', link: null },
  { id: 'e1', title: 'ลงทะเบียน myTCAS', description: 'เปิดลงทะเบียน', date: '2026-07-15', link: 'https://mytcas.com' },
]

describe('TcasCalendarTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState = { user: { uid: 'student-1' } }
    eventsState = {
      events: EVENTS,
      subscribeEvents,
      addEvent: vi.fn(),
      deleteEvent: vi.fn(),
    }
  })

  it('subscribes to events on mount', () => {
    render(<TcasCalendarTab today="2026-07-08" />)
    expect(subscribeEvents).toHaveBeenCalled()
  })

  it('splits events into passed and upcoming sections', () => {
    render(<TcasCalendarTab today="2026-07-08" />)
    expect(screen.getByText('ประกาศ Blueprint').closest('[data-testid="tcas-passed"]')).toBeTruthy()
    expect(screen.getByText('ลงทะเบียน myTCAS').closest('[data-testid="tcas-upcoming"]')).toBeTruthy()
  })

  it('expanding an event shows its description and Add to Calendar', () => {
    render(<TcasCalendarTab today="2026-07-08" />)
    fireEvent.click(screen.getByText('ลงทะเบียน myTCAS'))
    expect(screen.getByText('เปิดลงทะเบียน')).toBeTruthy()
    expect(screen.getByText('Add to Calendar')).toBeTruthy()
  })

  it('Add to Calendar copies the event into School appointments as kind tcas', () => {
    render(<TcasCalendarTab today="2026-07-08" />)
    fireEvent.click(screen.getByText('ลงทะเบียน myTCAS'))
    fireEvent.click(screen.getByText('Add to Calendar'))
    expect(addAppointment).toHaveBeenCalledWith(null, {
      title: 'ลงทะเบียน myTCAS', kind: 'tcas', dueDate: '2026-07-15',
    })
    expect(screen.getByText('เพิ่มลงตารางแล้ว')).toBeTruthy()
  })

  it('hides admin controls from a regular user', () => {
    render(<TcasCalendarTab today="2026-07-08" />)
    expect(screen.queryByLabelText('เพิ่มกิจกรรม TCAS')).toBeNull()
    expect(screen.queryByLabelText('ลบกิจกรรม')).toBeNull()
  })

  it('lets the admin add an event through the form', () => {
    authState = { user: { uid: 'IaltEhO0mPVfK3ng8npr4CdqnEE3' } }
    render(<TcasCalendarTab today="2026-07-08" />)
    fireEvent.click(screen.getByLabelText('เพิ่มกิจกรรม TCAS'))
    fireEvent.change(screen.getByLabelText('ชื่อกิจกรรม'), { target: { value: 'สอบ TGAT' } })
    fireEvent.change(screen.getByLabelText('วันที่'), { target: { value: '2026-12-13' } })
    fireEvent.change(screen.getByLabelText('รายละเอียด'), { target: { value: 'สนามสอบทั่วประเทศ' } })
    fireEvent.click(screen.getByText('บันทึกกิจกรรม'))
    expect(eventsState.addEvent).toHaveBeenCalledWith({
      title: 'สอบ TGAT', description: 'สนามสอบทั่วประเทศ', date: '2026-12-13', link: '',
    })
  })

  it('lets the admin delete an event', () => {
    authState = { user: { uid: 'IaltEhO0mPVfK3ng8npr4CdqnEE3' } }
    render(<TcasCalendarTab today="2026-07-08" />)
    fireEvent.click(screen.getAllByLabelText('ลบกิจกรรม')[0])
    expect(eventsState.deleteEvent).toHaveBeenCalledWith('e0')
  })
})
