import { describe, it, expect } from 'vitest'
import { habitStreak, toggleDone, goalProgress, scoreGap, readingProgress, todayKey } from './lifeLogic'

describe('habitStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(habitStreak(['2026-11-05', '2026-11-06', '2026-11-07'], '2026-11-07')).toBe(3)
  })
  it('keeps the streak alive when only yesterday is done', () => {
    expect(habitStreak(['2026-11-05', '2026-11-06'], '2026-11-07')).toBe(2)
  })
  it('resets after a gap', () => {
    expect(habitStreak(['2026-11-04', '2026-11-07'], '2026-11-07')).toBe(1)
    expect(habitStreak(['2026-11-04'], '2026-11-07')).toBe(0)
  })
  it('crosses month boundaries', () => {
    expect(habitStreak(['2026-10-31', '2026-11-01'], '2026-11-01')).toBe(2)
  })
})

describe('toggleDone', () => {
  it('adds then removes a day', () => {
    const a = toggleDone([], '2026-11-07')
    expect(a).toEqual(['2026-11-07'])
    expect(toggleDone(a, '2026-11-07')).toEqual([])
  })
})

describe('progress', () => {
  it('goalProgress from steps', () => {
    expect(goalProgress([])).toBe(0)
    expect(goalProgress([{ done: true }, { done: false }, { done: true }, { done: true }])).toBe(75)
  })
  it('scoreGap', () => {
    expect(scoreGap(70, 55)).toBe(15)
    expect(scoreGap(70, 80)).toBe(-10)
    expect(scoreGap(70, null)).toBe(null)
  })
  it('readingProgress clamps and guards zero total', () => {
    expect(readingProgress(50, 200)).toBe(25)
    expect(readingProgress(300, 200)).toBe(100)
    expect(readingProgress(5, 0)).toBe(0)
  })
  it('todayKey is YYYY-MM-DD', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
