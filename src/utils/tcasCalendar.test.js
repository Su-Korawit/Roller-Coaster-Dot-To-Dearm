import { describe, it, expect } from 'vitest'
import { splitTcasEvents } from './tcasCalendar'

const EVENTS = [
  { id: 'e3', title: 'สอบ TGAT', date: '2026-12-13' },
  { id: 'e1', title: 'ลงทะเบียน myTCAS', date: '2026-07-15' },
  { id: 'e0', title: 'ประกาศ Blueprint', date: '2026-06-01' },
  { id: 'e2', title: 'สมัครสอบ', date: '2026-10-28' },
]

describe('splitTcasEvents', () => {
  it('splits passed (date < today) from upcoming (date >= today)', () => {
    const { passed, upcoming } = splitTcasEvents(EVENTS, '2026-07-15')
    expect(passed.map((e) => e.id)).toEqual(['e0'])
    expect(upcoming.map((e) => e.id)).toEqual(['e1', 'e2', 'e3'])
  })

  it('counts an event dated exactly today as upcoming', () => {
    const { upcoming } = splitTcasEvents(EVENTS, '2026-07-15')
    expect(upcoming[0].id).toBe('e1')
  })

  it('sorts both halves by date ascending', () => {
    const { passed } = splitTcasEvents(EVENTS, '2027-01-01')
    expect(passed.map((e) => e.date)).toEqual(['2026-06-01', '2026-07-15', '2026-10-28', '2026-12-13'])
  })

  it('handles an empty list', () => {
    expect(splitTcasEvents([], '2026-07-15')).toEqual({ passed: [], upcoming: [] })
  })
})
