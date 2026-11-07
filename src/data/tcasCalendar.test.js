import { describe, it, expect } from 'vitest'
import { TCAS_CALENDAR, examDateForSubject, firstExamDate, formatThaiRange } from './tcasCalendar'

describe('examDateForSubject', () => {
  it('maps subject labels to the right exam day', () => {
    expect(examDateForSubject('TGAT1')).toBe('2027-01-30')
    expect(examDateForSubject('TGAT')).toBe('2027-01-30')
    expect(examDateForSubject('TPAT3')).toBe('2027-01-30')
    expect(examDateForSubject('TPAT1')).toBe('2027-02-13')
    expect(examDateForSubject('A-Level คณิตศาสตร์ 1')).toBe('2027-03-13')
    expect(examDateForSubject('a-level ฟิสิกส์')).toBe('2027-03-13')
    expect(examDateForSubject('ภาษาไทย')).toBeNull()
  })
  it('firstExamDate = earliest recognised exam, else the season opener', () => {
    expect(firstExamDate(['A-Level คณิตศาสตร์ 1', 'TGAT'])).toBe('2027-01-30')
    expect(firstExamDate([{ subject: 'A-Level ฟิสิกส์' }])).toBe('2027-03-13')
    expect(firstExamDate([])).toBe('2027-01-30')
    expect(firstExamDate(['ภาษาไทย'])).toBe('2027-01-30')
  })
})

describe('formatThaiRange', () => {
  it('formats single dates and ranges in Buddhist years', () => {
    expect(formatThaiRange('2027-02-13')).toBe('13 ก.พ. 2570')
    expect(formatThaiRange('2027-03-13', '2027-03-15')).toBe('13 - 15 มี.ค. 2570')
    expect(formatThaiRange('2027-01-30', '2027-02-01')).toBe('30 ม.ค. - 1 ก.พ. 2570')
    expect(formatThaiRange(null)).toBe('')
  })
})

describe('calendar data', () => {
  it('has the three exams and four rounds in order', () => {
    expect(TCAS_CALENDAR.exams.map((e) => e.id)).toEqual(['tgat', 'tpat1', 'alevel'])
    expect(TCAS_CALENDAR.rounds.map((r) => r.round)).toEqual([1, 2, 3, 4])
    const starts = TCAS_CALENDAR.exams.map((e) => e.start)
    expect([...starts].sort()).toEqual(starts)
  })
})
