import { describe, it, expect } from 'vitest'
import { formatDays, urgency, subjectCountdowns, nextCountdown, portfolioDeadlines, seasonMilestones, nearestPortfolio, upcomingPortfolios } from './countdownLogic'

const TODAY = '2026-11-13'

describe('formatDays / urgency', () => {
  it('words', () => {
    expect(formatDays(0)).toBe('วันนี้')
    expect(formatDays(1)).toBe('พรุ่งนี้')
    expect(formatDays(12)).toBe('อีก 12 วัน')
    expect(formatDays(-3)).toBe('ผ่านมา 3 วัน')
    expect(formatDays(null)).toBe('')
  })
  it('tones', () => {
    expect(urgency(-1)).toBe('past')
    expect(urgency(7)).toBe('soon')
    expect(urgency(30)).toBe('near')
    expect(urgency(31)).toBe('far')
    expect(urgency(null)).toBe('far')
  })
})

describe('subjectCountdowns', () => {
  const scores = [{ subject: 'A-Level ฟิสิกส์' }, { subject: 'TGAT1' }, { subject: 'TPAT3' }]
  it('gives each subject its own calendar day, soonest first', () => {
    const rows = subjectCountdowns({ target: {}, scores, today: TODAY })
    expect(rows).toHaveLength(3)
    expect(rows[2].subject).toBe('A-Level ฟิสิกส์')
    expect(rows[0].date <= rows[1].date && rows[1].date <= rows[2].date).toBe(true)
    const tgat = rows.find((r) => r.subject === 'TGAT1')
    expect(tgat).toMatchObject({ date: '2027-01-30', session: 'บ่าย', exact: true, manual: false })
    expect(tgat.days).toBe(78)
  })
  it('a hand-set date replaces every subject date', () => {
    const rows = subjectCountdowns({ target: { examDate: '2027-02-10', examDateManual: true }, scores, today: TODAY })
    expect(new Set(rows.map((r) => r.date))).toEqual(new Set(['2027-02-10']))
    expect(rows.every((r) => r.manual && r.session === null)).toBe(true)
  })
  it('skips subjects with no known date', () => {
    expect(subjectCountdowns({ target: { examDateManual: true, examDate: '' }, scores, today: TODAY })).toEqual([])
  })
})

describe('nextCountdown', () => {
  it('skips passed exams', () => {
    const rows = [{ date: '2026-11-01', days: -12 }, { date: '2026-12-01', days: 18 }, { date: '2027-01-01', days: 49 }]
    expect(nextCountdown(rows).days).toBe(18)
    expect(nextCountdown([{ days: -1 }])).toBeNull()
  })
})

describe('portfolioDeadlines', () => {
  const program = {
    p: '10010121300001A',
    n: 'วิศวกรรมศาสตร์',
    j: [
      { r: 2, id: 'Q1', n: 'โควตา', fo: { cd: '2026-12-01' } },
      { r: 1, id: 'P2', n: 'ภายหลัง', fo: { cd: '2027-01-10', ce: '2027-01-15' } },
      { r: 1, id: 'P1', n: 'ก่อน', fo: { cd: '2026-11-20' } },
      { r: 1, id: 'P3', n: 'ไม่มีวัน', fo: { q: [] } },
    ],
  }
  it('keeps round-1 projects with a submit-by date, soonest first', () => {
    const rows = portfolioDeadlines(program, TODAY)
    expect(rows.map((r) => r.title)).toEqual(['ก่อน', 'ภายหลัง'])
    expect(rows[0]).toMatchObject({ date: '2026-11-20', days: 7, editUntil: null, editDays: null })
    expect(rows[1]).toMatchObject({ days: 58, editUntil: '2027-01-15', editDays: 63 })
  })
  it('handles a missing programme', () => {
    expect(portfolioDeadlines(null, TODAY)).toEqual([])
  })
})

describe('seasonMilestones', () => {
  it('puts upcoming first by date and past last', () => {
    const cal = {
      exams: [{ id: 'x', label: 'สอบ X', start: '2026-11-01' }],
      rounds: [{ round: 3, label: 'Admission', start: '2026-12-01', end: '2026-12-05', result: null }],
    }
    const rows = seasonMilestones(TODAY, cal)
    expect(rows.map((r) => r.id)).toEqual(['r3-start', 'r3-end', 'exam-x'])
    expect(rows[0].days).toBe(18)
  })
  it('works with the real calendar', () => {
    const rows = seasonMilestones(TODAY)
    expect(rows.length).toBeGreaterThan(5)
    expect(rows[0].days).toBeGreaterThanOrEqual(0)
  })
})

describe('nearestPortfolio', () => {
  const goals = [{ id: 'a' }, { id: 'b' }]
  it('picks the soonest upcoming one across goals', () => {
    const byGoal = {
      a: { rows: [{ title: 'ผ่านแล้ว', days: -2 }, { title: 'A1', days: 20 }] },
      b: { rows: [{ title: 'B1', days: 9 }] },
    }
    const n = nearestPortfolio(byGoal, goals)
    expect(n).toMatchObject({ title: 'B1', days: 9 })
    expect(n.goal.id).toBe('b')
  })
  it('null when nothing is upcoming', () => {
    expect(nearestPortfolio({ a: { rows: [{ days: -1 }] } }, goals)).toBeNull()
    expect(nearestPortfolio({}, [])).toBeNull()
  })
})

describe('upcomingPortfolios', () => {
  it('lists upcoming ones across goals, soonest first, capped', () => {
    const goals = [{ id: 'a' }, { id: 'b' }]
    const byGoal = { a: { rows: [{ title: 'A', days: 5 }, { title: 'old', days: -1 }, { title: 'A2', days: 40 }] }, b: { rows: [{ title: 'B', days: 2 }] } }
    expect(upcomingPortfolios(byGoal, goals, 2).map((r) => r.title)).toEqual(['B', 'A'])
    expect(upcomingPortfolios({}, goals)).toEqual([])
  })
})
