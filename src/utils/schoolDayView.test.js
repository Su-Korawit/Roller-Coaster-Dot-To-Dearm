import { describe, it, expect } from 'vitest'
import { DAY_KEYS, dayKeyFromDate, slotsForDay, appointmentsDueOn, isOverdue } from './schoolDayView'

describe('dayKeyFromDate', () => {
  // Jan 1, 2000 is a well-known Saturday — fixed reference, no reliance on "today".
  it('maps 2000-01-01 (Saturday) to sat', () => {
    expect(dayKeyFromDate('2000-01-01')).toBe('sat')
  })
  it('maps 2000-01-02 (Sunday) to sun', () => {
    expect(dayKeyFromDate('2000-01-02')).toBe('sun')
  })
  it('maps 2000-01-03 (Monday) to mon', () => {
    expect(dayKeyFromDate('2000-01-03')).toBe('mon')
  })
})

describe('slotsForDay', () => {
  const slots = [
    { id: 's1', subjectId: 'math', day: 'mon', startTime: '13:00', endTime: '14:00' },
    { id: 's2', subjectId: 'physics', day: 'mon', startTime: '09:00', endTime: '10:00' },
    { id: 's3', subjectId: 'english', day: 'tue', startTime: '08:00', endTime: '09:00' },
  ]

  it('filters to the requested day', () => {
    const result = slotsForDay(slots, 'tue')
    expect(result.map((s) => s.id)).toEqual(['s3'])
  })

  it('sorts by startTime ascending', () => {
    const result = slotsForDay(slots, 'mon')
    expect(result.map((s) => s.id)).toEqual(['s2', 's1'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(slotsForDay(slots, 'sun')).toEqual([])
  })
})

describe('appointmentsDueOn', () => {
  const appointments = [
    { id: 'a1', subjectId: 'math', title: 'Page 21', dueDate: '2026-07-10', completed: false, createdAt: 200 },
    { id: 'a2', subjectId: 'math', title: 'Quiz', dueDate: '2026-07-10', completed: true, createdAt: 100 },
    { id: 'a3', subjectId: 'math', title: 'Page 5', dueDate: '2026-07-10', completed: false, createdAt: 100 },
    { id: 'a4', subjectId: 'physics', title: 'Lab report', dueDate: '2026-07-11', completed: false, createdAt: 50 },
  ]

  it('filters to the requested date', () => {
    const result = appointmentsDueOn(appointments, '2026-07-11')
    expect(result.map((a) => a.id)).toEqual(['a4'])
  })

  it('sorts incomplete before completed, then by createdAt ascending', () => {
    const result = appointmentsDueOn(appointments, '2026-07-10')
    expect(result.map((a) => a.id)).toEqual(['a3', 'a1', 'a2'])
  })

  it('returns an empty array when nothing is due', () => {
    expect(appointmentsDueOn(appointments, '2026-01-01')).toEqual([])
  })
})

describe('isOverdue', () => {
  it('is true for an incomplete appointment due before today', () => {
    expect(isOverdue({ completed: false, dueDate: '2026-07-01' }, '2026-07-08')).toBe(true)
  })
  it('is false for a completed appointment even if due before today', () => {
    expect(isOverdue({ completed: true, dueDate: '2026-07-01' }, '2026-07-08')).toBe(false)
  })
  it('is false for an appointment due today or in the future', () => {
    expect(isOverdue({ completed: false, dueDate: '2026-07-08' }, '2026-07-08')).toBe(false)
    expect(isOverdue({ completed: false, dueDate: '2026-07-09' }, '2026-07-08')).toBe(false)
  })
})
