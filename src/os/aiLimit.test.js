import { describe, it, expect } from 'vitest'
import { AI_LIMITS, checkLimit, pruneUsage, recordUse, resetKey, usageCounts } from './aiLimit'

// 2026-11-11 is a Wednesday, so its week started Monday 2026-11-09.
const WED = '2026-11-11'

describe('usageCounts', () => {
  it('counts today and this week only', () => {
    const log = { '2026-11-08': 9, '2026-11-09': 2, '2026-11-10': 3, [WED]: 4 }
    expect(usageCounts(log, WED)).toEqual({ day: 4, week: 9 })
  })
  it('ignores junk values', () => {
    expect(usageCounts({ [WED]: 'x', '2026-11-10': -2 }, WED)).toEqual({ day: 0, week: 0 })
  })
})

describe('checkLimit', () => {
  it('allows with the lower of the two remainders', () => {
    const r = checkLimit({ [WED]: 5 }, WED, { day: 20, week: 80 })
    expect(r).toMatchObject({ allowed: true, reason: null, left: 15 })
  })
  it('blocks on the daily limit', () => {
    const r = checkLimit({ [WED]: AI_LIMITS.day }, WED)
    expect(r).toMatchObject({ allowed: false, reason: 'day', left: 0 })
  })
  it('blocks on the weekly limit even when today is fresh', () => {
    const log = { '2026-11-09': 20, '2026-11-10': 20, '2026-11-12': 0 }
    const r = checkLimit(log, WED, { day: 20, week: 40 })
    expect(r).toMatchObject({ allowed: false, reason: 'week', left: 0 })
  })
  it('weekly remainder caps what is left today', () => {
    const r = checkLimit({ '2026-11-10': 18 }, WED, { day: 20, week: 20 })
    expect(r.left).toBe(2)
  })
  it('a new week starts clean', () => {
    expect(checkLimit({ '2026-11-08': 80 }, WED).allowed).toBe(true)
  })
})

describe('recordUse / pruneUsage', () => {
  it('adds one to today and drops last week', () => {
    const next = recordUse({ '2026-11-02': 7, [WED]: 1 }, WED)
    expect(next).toEqual({ [WED]: 2 })
  })
  it('starts from zero', () => {
    expect(recordUse({}, WED)).toEqual({ [WED]: 1 })
  })
  it('prune keeps this week', () => {
    expect(pruneUsage({ '2026-11-09': 1, '2026-11-08': 5 }, WED)).toEqual({ '2026-11-09': 1 })
  })
})

describe('resetKey', () => {
  it('daily resets tomorrow, weekly next Monday', () => {
    expect(resetKey('day', WED)).toBe('2026-11-12')
    expect(resetKey('week', WED)).toBe('2026-11-16')
  })
})
