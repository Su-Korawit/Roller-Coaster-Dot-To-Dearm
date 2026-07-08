// @vitest-environment jsdom
// Regression test for the getSnapshot infinite loop: unlike the colocated
// unit tests (which mock useSchoolStore as a plain function), this renders
// against the REAL Zustand store, so unstable selectors — e.g. `.filter()`
// returning a fresh array every call — crash with "Maximum update depth
// exceeded" exactly as they do in the browser.
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import SubjectDetailPanel from './SubjectDetailPanel'
import { useSchoolStore } from '../../stores/useSchoolStore'

describe('SubjectDetailPanel against the real store', () => {
  beforeEach(() => {
    useSchoolStore.getState().clearSchool()
  })

  it('renders a subject with slots and appointments without an infinite getSnapshot loop', () => {
    const id = useSchoolStore.getState().addSubject({ name: 'Math' })
    useSchoolStore.getState().addScheduleSlot(id, { day: 'mon', startTime: '09:00', endTime: '10:00' })
    useSchoolStore.getState().addAppointment(id, { title: 'Page 21', dueDate: '2026-07-10' })
    useSchoolStore.getState().upsertNote({ date: '2026-07-08', subjectId: id, text: 'note' })

    render(<SubjectDetailPanel subjectId={id} onClose={() => {}} today="2026-07-08" />)

    expect(screen.getByLabelText('ชื่อวิชา').value).toBe('Math')
    expect(screen.getByText(/mon.*09:00.*10:00/i)).toBeTruthy()
    expect(screen.getByText('Page 21')).toBeTruthy()
  })
})
