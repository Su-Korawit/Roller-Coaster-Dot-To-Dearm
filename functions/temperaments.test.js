import { describe, it, expect } from 'vitest'
import t from './temperaments.js'

const { TEMPERAMENT_BY_MBTI, temperamentOf, xpMultiplier, DEEP_FOCUS_MS, SPRINT_DAILY_MS, bangkokHour } = t
const MIN = 60 * 1000
// 2026-10-14 10:00 Bangkok, 21:00 Bangkok, 01:00 Bangkok (next day)
const MORNING = Date.UTC(2026, 9, 14, 3, 0)
const EVENING = Date.UTC(2026, 9, 14, 14, 0)
const AFTER_MIDNIGHT = Date.UTC(2026, 9, 14, 18, 0)

describe('temperamentOf', () => {
  it('covers all 16 types, four per temperament, case-insensitively', () => {
    expect(Object.keys(TEMPERAMENT_BY_MBTI)).toHaveLength(16)
    for (const tp of ['NT', 'NF', 'SJ', 'SP']) {
      expect(Object.values(TEMPERAMENT_BY_MBTI).filter((x) => x === tp)).toHaveLength(4)
    }
    expect(temperamentOf('intj')).toBe('NT')
    expect(temperamentOf('ESFP')).toBe('SP')
  })
  it('returns null for unknown or missing types', () => {
    expect(temperamentOf('XXXX')).toBeNull()
    expect(temperamentOf(undefined)).toBeNull()
    expect(temperamentOf(42)).toBeNull()
  })
})

describe('xpMultiplier', () => {
  it('NT: deep-focus bonus once the session has 50 verified minutes', () => {
    expect(xpMultiplier({ temperament: 'NT', sessionVerifiedMs: DEEP_FOCUS_MS - 1, nowMs: MORNING })).toBe(1)
    expect(xpMultiplier({ temperament: 'NT', sessionVerifiedMs: DEEP_FOCUS_MS, nowMs: MORNING })).toBeCloseTo(1.1)
  })

  it('NF: night-owl bonus from 20:00 to 01:59 Bangkok only', () => {
    expect(bangkokHour(EVENING)).toBe(21)
    expect(xpMultiplier({ temperament: 'NF', nowMs: EVENING })).toBeCloseTo(1.1)
    expect(xpMultiplier({ temperament: 'NF', nowMs: AFTER_MIDNIGHT })).toBeCloseTo(1.1)
    expect(xpMultiplier({ temperament: 'NF', nowMs: MORNING })).toBe(1)
    expect(xpMultiplier({ temperament: 'NF', nowMs: Date.UTC(2026, 9, 14, 19, 0) })).toBe(1)   // 02:00 Bangkok
  })

  it('SJ: routine bonus only when the student studied yesterday', () => {
    expect(xpMultiplier({ temperament: 'SJ', studiedYesterday: true, nowMs: MORNING })).toBeCloseTo(1.1)
    expect(xpMultiplier({ temperament: 'SJ', studiedYesterday: false, nowMs: MORNING })).toBe(1)
  })

  it('SP: sprint bonus on the first 30 minutes of the day', () => {
    expect(xpMultiplier({ temperament: 'SP', dailyBeforeMs: SPRINT_DAILY_MS - 1, nowMs: MORNING })).toBeCloseTo(1.1)
    expect(xpMultiplier({ temperament: 'SP', dailyBeforeMs: SPRINT_DAILY_MS, nowMs: MORNING })).toBe(1)
  })

  it('no temperament (unset / unknown MBTI) never gets a bonus', () => {
    expect(xpMultiplier({ temperament: null, sessionVerifiedMs: 1e9, dailyBeforeMs: 0, studiedYesterday: true, nowMs: EVENING })).toBe(1)
  })

  it('a perk is never more than +10%', () => {
    for (const tp of ['NT', 'NF', 'SJ', 'SP']) {
      const m = xpMultiplier({ temperament: tp, sessionVerifiedMs: 1e9, dailyBeforeMs: 0, studiedYesterday: true, nowMs: EVENING })
      expect(m).toBeLessThanOrEqual(1.1000001)
    }
  })
})
