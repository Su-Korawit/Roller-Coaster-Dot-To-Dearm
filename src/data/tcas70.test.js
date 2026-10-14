import { describe, it, expect } from 'vitest'
import { TCAS70_EVENTS, daysUntil, eventsWithFallback, nextMilestone } from './tcas70'

describe('TCAS70 calendar data', () => {
  it('every entry has a valid ISO date, title, description and the mytcas link', () => {
    for (const e of TCAS70_EVENTS) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(e.date))).toBe(false)
      expect(e.title.length).toBeGreaterThan(5)
      expect(e.description.length).toBeGreaterThan(5)
      expect(e.link).toBe('https://www.mytcas.com/')
    }
    expect(new Set(TCAS70_EVENTS.map((e) => e.id)).size).toBe(TCAS70_EVENTS.length)
  })

  it('is in chronological order and spans the four rounds (Portfolio, Quota, Admission, Direct)', () => {
    const dates = TCAS70_EVENTS.map((e) => e.date)
    expect([...dates].sort()).toEqual(dates)
    const text = TCAS70_EVENTS.map((e) => e.title).join(' ')
    for (const k of ['Portfolio', 'Quota', 'Admission', 'Direct Admission', 'TGAT', 'A-Level']) expect(text).toContain(k)
  })

  it('daysUntil counts whole calendar days across month and year ends', () => {
    expect(daysUntil('2026-10-15', '2026-10-14')).toBe(1)
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1)
    expect(daysUntil('2026-10-14', '2026-10-14')).toBe(0)
    expect(daysUntil('2026-10-10', '2026-10-14')).toBe(-4)
  })

  it('nextMilestone picks the first entry on or after today, or null once all have passed', () => {
    const m = nextMilestone(TCAS70_EVENTS, '2026-10-14')
    expect(m.event.id).toBe('tcas70-tgat-register')
    expect(m.days).toBe(21)
    expect(nextMilestone(TCAS70_EVENTS, '2027-03-13').event.date).toBe('2027-03-13')
    expect(nextMilestone(TCAS70_EVENTS, '2030-01-01')).toBeNull()
  })

  it('admin events replace the built-in calendar; an empty list falls back to it', () => {
    const mine = [{ id: 'x', date: '2026-11-01', title: 'ของฉัน' }]
    expect(eventsWithFallback(mine)).toBe(mine)
    expect(eventsWithFallback([])).toBe(TCAS70_EVENTS)
    expect(eventsWithFallback(undefined)).toBe(TCAS70_EVENTS)
  })
})
