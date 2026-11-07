import { describe, it, expect } from 'vitest'
import { moodWeeks, moodByDate, moodFrequency, withMood, moodLabel } from './moodLogic'

describe('moodWeeks', () => {
  it('ends with this week, Sunday first, future days null', () => {
    const w = moodWeeks('2026-11-07', 4)   // Saturday
    expect(w).toHaveLength(4)
    expect(w[3][0]).toBe('2026-11-01')
    expect(w[3][6]).toBe('2026-11-07')
    expect(w[0][0]).toBe('2026-10-11')
    const mid = moodWeeks('2026-11-04', 2)  // Wednesday
    expect(mid[1].slice(0, 4)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'])
    expect(mid[1].slice(4)).toEqual([null, null, null])
  })
})

describe('moodByDate / withMood', () => {
  it('last entry of a day wins and bad levels are dropped', () => {
    expect(moodByDate([{ date: 'a', feel: 2 }, { date: 'a', feel: 4 }, { date: 'b', feel: 9 }, { feel: 3 }])).toEqual({ a: 4 })
  })
  it('keeps one entry per day', () => {
    const n = withMood([{ date: 'a', feel: 2 }, { date: 'b', feel: 3 }], 'a', 5)
    expect(n).toEqual([{ date: 'b', feel: 3 }, { date: 'a', feel: 5 }])
  })
})

describe('moodFrequency', () => {
  it('counts each mood in the window and averages', () => {
    const notes = [{ date: '2026-11-07', feel: 5 }, { date: '2026-11-06', feel: 5 }, { date: '2026-11-05', feel: 2 }, { date: '2026-09-01', feel: 1 }]
    const f = moodFrequency(notes, '2026-11-07', 30)
    expect(f.counts).toEqual({ 1: 0, 2: 1, 3: 0, 4: 0, 5: 2 })
    expect(f.total).toBe(3)
    expect(f.average).toBe(4)
    expect(moodFrequency([], '2026-11-07').average).toBeNull()
  })
})

describe('moodLabel', () => {
  it('has Thai labels', () => {
    expect(moodLabel(5)).toBe('ดีมาก')
    expect(moodLabel(9)).toBe('')
  })
})
