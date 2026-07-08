import { describe, it, expect } from 'vitest'
import { nextStreak, cyclePosition, motivationMessage, MESSAGES } from './streakCycle'

describe('nextStreak', () => {
  it('starts at 1 on the first ever check-in', () => {
    expect(nextStreak(null, '2026-07-09', 0)).toEqual({ streak: 1, changed: true, broken: false })
  })

  it('increments when the last counted day was yesterday', () => {
    expect(nextStreak('2026-07-08', '2026-07-09', 3)).toEqual({ streak: 4, changed: true, broken: false })
  })

  it('handles month boundaries (July 31 → Aug 1)', () => {
    expect(nextStreak('2026-07-31', '2026-08-01', 9)).toEqual({ streak: 10, changed: true, broken: false })
  })

  it('does not change on a same-day repeat', () => {
    expect(nextStreak('2026-07-09', '2026-07-09', 4)).toEqual({ streak: 4, changed: false, broken: false })
  })

  it('resets to 1 after a gap, flagging broken when a real streak was lost', () => {
    expect(nextStreak('2026-07-05', '2026-07-09', 6)).toEqual({ streak: 1, changed: true, broken: true })
  })

  it('a gap from streak 1 is a reset but not "broken"', () => {
    expect(nextStreak('2026-07-05', '2026-07-09', 1)).toEqual({ streak: 1, changed: true, broken: false })
  })
})

describe('cyclePosition', () => {
  it('maps streaks onto the 5-dot cycle', () => {
    expect(cyclePosition(1)).toBe(1)
    expect(cyclePosition(3)).toBe(3)
    expect(cyclePosition(5)).toBe(5)
    expect(cyclePosition(6)).toBe(1)
    expect(cyclePosition(10)).toBe(5)
  })
  it('is 0 for a zero streak', () => {
    expect(cyclePosition(0)).toBe(0)
  })
})

describe('motivationMessage', () => {
  it('returns the gentle-restart line for a broken streak', () => {
    expect(motivationMessage(1, true)).toContain('เริ่มใหม่')
  })
  it('rotates deterministically through MESSAGES by streak number', () => {
    expect(motivationMessage(3, false)).toBe(MESSAGES[3 % MESSAGES.length])
    expect(motivationMessage(3 + MESSAGES.length, false)).toBe(MESSAGES[3 % MESSAGES.length])
  })
})
