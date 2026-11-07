import { describe, it, expect } from 'vitest'
import { dateKey, monthCells, groupByDate, upcomingEvents } from './calendarLogic'

describe('monthCells', () => {
  it('pads to the weekday of the 1st and lists every day', () => {
    // 1 Nov 2026 is a Sunday: no leading blanks, 30 days
    const c = monthCells(2026, 10)
    expect(c[0]).toBe('2026-11-01')
    expect(c).toHaveLength(30)
    // 1 Dec 2026 is a Tuesday: 2 blanks
    const d = monthCells(2026, 11)
    expect(d.slice(0, 3)).toEqual([null, null, '2026-12-01'])
    expect(d).toHaveLength(2 + 31)
  })
})

describe('dateKey', () => {
  it('zero-pads month and day', () => expect(dateKey(2027, 0, 5)).toBe('2027-01-05'))
})

describe('groupByDate', () => {
  it('groups by date and skips undated items', () => {
    const g = groupByDate([{ date: 'a', id: 1 }, { date: 'a', id: 2 }, { id: 3 }])
    expect(g.a.map((x) => x.id)).toEqual([1, 2])
    expect(Object.keys(g)).toEqual(['a'])
  })
})

describe('upcomingEvents', () => {
  it('keeps today and later, sorted, limited', () => {
    const ev = [{ date: '2026-01-03' }, { date: '2026-01-01' }, { date: '2026-01-02' }, { date: '2025-12-31' }]
    expect(upcomingEvents(ev, '2026-01-01', 2).map((e) => e.date)).toEqual(['2026-01-01', '2026-01-02'])
  })
})
