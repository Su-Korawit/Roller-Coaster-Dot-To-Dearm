// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let eventsState
vi.mock('../stores/useTcasEventsStore', () => ({
  useTcasEventsStore: Object.assign((sel) => sel(eventsState), { getState: () => eventsState }),
}))
vi.mock('../stores/useSchoolStore', () => ({
  useSchoolStore: Object.assign((sel) => sel({ addAppointment: vi.fn() }), { getState: () => ({ addAppointment: vi.fn() }) }),
}))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel({ user: { uid: 'IaltEhO0mPVfK3ng8npr4CdqnEE3' } }) }))

const { default: TcasCalendarTab } = await import('./TcasCalendarTab')

describe('admin event form: plan fields', () => {
  beforeEach(() => {
    eventsState = { events: [], subscribeEvents: () => () => {}, addEvent: vi.fn().mockResolvedValue(undefined), deleteEvent: vi.fn() }
  })

  it('sends round, kind and exam keys with the event', () => {
    render(<TcasCalendarTab today="2027-01-01" />)
    fireEvent.click(screen.getByLabelText('เพิ่มกิจกรรม TCAS'))
    fireEvent.change(screen.getByLabelText('ชื่อกิจกรรม'), { target: { value: 'สอบ A-Level' } })
    fireEvent.change(screen.getByLabelText('วันที่'), { target: { value: '2027-03-13' } })
    fireEvent.change(screen.getByLabelText('รอบ'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('ประเภท'), { target: { value: 'exam' } })
    fireEvent.change(screen.getByLabelText('รหัสวิชาที่สอบ'), { target: { value: 'a_lv_64, a_lv_65' } })
    fireEvent.click(screen.getByText('บันทึกกิจกรรม'))
    expect(eventsState.addEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'สอบ A-Level', date: '2027-03-13', round: '3', kind: 'exam', examKeys: 'a_lv_64, a_lv_65' }))
  })

  it('the new fields are optional', () => {
    render(<TcasCalendarTab today="2027-01-01" />)
    fireEvent.click(screen.getByLabelText('เพิ่มกิจกรรม TCAS'))
    fireEvent.change(screen.getByLabelText('ชื่อกิจกรรม'), { target: { value: 'ข่าวทั่วไป' } })
    fireEvent.change(screen.getByLabelText('วันที่'), { target: { value: '2027-03-13' } })
    fireEvent.click(screen.getByText('บันทึกกิจกรรม'))
    expect(eventsState.addEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'ข่าวทั่วไป', round: '', kind: '', examKeys: '' }))
  })
})
