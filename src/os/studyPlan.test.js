import { describe, it, expect } from 'vitest'
import {
  daysUntil, buildStudyPlan, planToTasks, replaceAutoTasks, planSuccess, weekMinutes, roomIdFor, subjectTag, formatMinutes,
} from './studyPlan'

describe('daysUntil', () => {
  it('counts whole days, 0 on the day, negative after', () => {
    expect(daysUntil('2027-01-10', '2027-01-01')).toBe(9)
    expect(daysUntil('2027-01-01', '2027-01-01')).toBe(0)
    expect(daysUntil('2026-12-31', '2027-01-01')).toBe(-1)
  })
  it('returns null for missing or bad dates', () => {
    expect(daysUntil('', '2027-01-01')).toBeNull()
    expect(daysUntil('soon', '2027-01-01')).toBeNull()
  })
})

describe('buildStudyPlan', () => {
  const scores = [
    { subject: 'TGAT', needed: 70, mine: 40 },
    { subject: 'A-Level คณิต', needed: 60, mine: 55 },
    { subject: 'A-Level ฟิสิกส์', needed: 60, mine: null },
  ]
  const plan = buildStudyPlan({ today: '2027-01-01', examDate: '2027-01-10', scores, hoursPerDay: 2 })
  it('has one entry per day including exam day', () => {
    expect(plan).toHaveLength(10)
    expect(plan[0].date).toBe('2027-01-01')
    expect(plan[9].date).toBe('2027-01-10')
  })
  it('fills exactly hoursPerDay each day in 15 minute steps', () => {
    for (const d of plan) {
      expect(d.tasks.reduce((a, t) => a + t.minutes, 0)).toBe(120)
      expect(d.tasks.every((t) => t.minutes % 15 === 0 && t.minutes > 0)).toBe(true)
    }
  })
  it('gives a bigger gap more minutes overall', () => {
    const by = {}
    for (const d of plan) for (const t of d.tasks) by[t.subject] = (by[t.subject] || 0) + t.minutes
    expect(by['A-Level คณิต']).toBeLessThan(by.TGAT)
  })
  it('is empty without a valid future date or subjects', () => {
    expect(buildStudyPlan({ today: '2027-01-05', examDate: '2027-01-01', scores })).toEqual([])
    expect(buildStudyPlan({ today: '2027-01-01', examDate: '2027-01-10', scores: [] })).toEqual([])
  })
  it('caps very long plans', () => {
    expect(buildStudyPlan({ today: '2027-01-01', examDate: '2028-12-31', scores })).toHaveLength(120)
  })
  it('works with a single subject', () => {
    const one = buildStudyPlan({ today: '2027-01-01', examDate: '2027-01-02', scores: [scores[0]], hoursPerDay: 1 })
    expect(one[0].tasks).toEqual([expect.objectContaining({ subject: 'TGAT', minutes: 60, tag: 'TGAT' })])
  })
})

describe('plan tasks', () => {
  it('tags subjects', () => {
    expect(subjectTag('TGAT 1')).toBe('TGAT')
    expect(subjectTag('A-Level คณิต')).toBe('A-LEVEL')
    expect(subjectTag('ภาษาไทย')).toBe('อื่นๆ')
  })
  it('replaceAutoTasks keeps history and manual tasks only', () => {
    const old = [
      { id: 'a', auto: true, date: '2027-01-01' },
      { id: 'b', auto: true, date: '2027-01-05' },
      { id: 'c', date: '2027-01-05' },
    ]
    const out = replaceAutoTasks(old, [{ id: 'n', auto: true, date: '2027-01-05' }], '2027-01-03')
    expect(out.map((t) => t.id)).toEqual(['a', 'c', 'n'])
  })
  it('planToTasks marks tasks auto', () => {
    const t = planToTasks([{ date: '2027-01-01', tasks: [{ subject: 'X', minutes: 30, tag: 'อื่นๆ', text: 'X 30 นาที' }] }])
    expect(t[0]).toMatchObject({ auto: true, done: false, minutes: 30, date: '2027-01-01' })
  })
  it('planSuccess = finished minutes / planned minutes up to today', () => {
    const tasks = [
      { auto: true, date: '2027-01-01', minutes: 60, done: true },
      { auto: true, date: '2027-01-02', minutes: 60, done: false },
      { auto: true, date: '2027-01-09', minutes: 60, done: false },
    ]
    expect(planSuccess(tasks, '2027-01-02')).toEqual({ plannedMin: 120, doneMin: 60, percent: 50 })
    expect(planSuccess([], '2027-01-02').percent).toBe(0)
  })
})

describe('misc helpers', () => {
  it('weekMinutes sums the last 7 days', () => {
    expect(weekMinutes({ '2027-01-07': 30, '2027-01-01': 20, '2026-12-31': 99 }, '2027-01-07')).toBe(50)
  })
  it('formatMinutes', () => {
    expect(formatMinutes(45)).toBe('45 น.')
    expect(formatMinutes(135)).toBe('2 ชม. 15 น.')
  })
  it('roomIdFor ignores university and is path-safe', () => {
    expect(roomIdFor('วิศวกรรมศาสตร์', 'คอมพิวเตอร์')).toBe('วิศวกรรมศาสตร์__คอมพิวเตอร์')
    expect(roomIdFor('  แพทย์ศาสตร์ ', '')).toBe('แพทย์ศาสตร์')
    expect(roomIdFor('', 'x')).toBe('')
    expect(roomIdFor('a/b', 'c.d')).not.toMatch(/[/.]/)
  })
})

import { weekStartKey, sumMinutes, thisWeekMinutes, readingStreak, rankEntries } from './studyPlan'

describe('reading leaderboard helpers', () => {
  it('weekStartKey returns the Monday', () => {
    expect(weekStartKey('2026-11-07')).toBe('2026-11-02')   // Saturday
    expect(weekStartKey('2026-11-02')).toBe('2026-11-02')   // Monday
    expect(weekStartKey('2026-11-08')).toBe('2026-11-02')   // Sunday
  })
  it('sums totals and this-week minutes', () => {
    const log = { '2026-11-01': 30, '2026-11-02': 20, '2026-11-07': 40 }
    expect(sumMinutes(log)).toBe(90)
    expect(thisWeekMinutes(log, '2026-11-07')).toBe(60)
  })
  it('readingStreak counts back from today or yesterday', () => {
    expect(readingStreak({ '2026-11-07': 5, '2026-11-06': 5, '2026-11-05': 5 }, '2026-11-07')).toBe(3)
    expect(readingStreak({ '2026-11-06': 5 }, '2026-11-07')).toBe(1)
    expect(readingStreak({ '2026-11-04': 5 }, '2026-11-07')).toBe(0)
  })
  it('rankEntries zeroes old weeks and sorts', () => {
    const rows = rankEntries([
      { uid: 'a', weekKey: '2026-10-26', weekMinutes: 999, totalMinutes: 999 },
      { uid: 'b', weekKey: '2026-11-02', weekMinutes: 50, totalMinutes: 50 },
      { uid: 'c', weekKey: '2026-11-02', weekMinutes: 80, totalMinutes: 80 },
    ], '2026-11-07')
    expect(rows.map((r) => [r.uid, r.minutes, r.rank])).toEqual([['c', 80, 1], ['b', 50, 2], ['a', 0, 3]])
  })
})
