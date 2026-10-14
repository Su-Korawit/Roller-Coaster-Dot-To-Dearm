import { describe, it, expect } from 'vitest'
import math from './focusMath.js'

const { CHECKIN_WINDOW_MS, MIN_GAP_MS, DAILY_CAP_MS, bangkokDay, settleSegment, xpDelta } = math
const MIN = 60 * 1000

describe('settleSegment', () => {
  it('credits the full gap when it is inside the check-in window', () => {
    expect(settleSegment({ lastCheckInAt: 0, nowMs: 25 * MIN })).toMatchObject({ creditedMs: 25 * MIN, lapsed: false, capped: false })
    expect(settleSegment({ lastCheckInAt: 0, nowMs: CHECKIN_WINDOW_MS }).creditedMs).toBe(CHECKIN_WINDOW_MS)
  })

  it('drops (does not credit) a gap longer than the window', () => {
    expect(settleSegment({ lastCheckInAt: 0, nowMs: CHECKIN_WINDOW_MS + 1 }))
      .toMatchObject({ creditedMs: 0, lapsed: true })
    expect(settleSegment({ lastCheckInAt: 0, nowMs: 3 * 60 * MIN }).creditedMs).toBe(0)
  })

  it('ignores calls closer together than MIN_GAP_MS', () => {
    expect(settleSegment({ lastCheckInAt: 1000, nowMs: 1000 + MIN_GAP_MS - 1 }))
      .toMatchObject({ creditedMs: 0, tooSoon: true })
    expect(settleSegment({ lastCheckInAt: 1000, nowMs: 500 }).tooSoon).toBe(true)   // clock went backwards
  })

  it('cuts credit at the daily cap and reports it', () => {
    const r = settleSegment({ lastCheckInAt: 0, nowMs: 30 * MIN, dailyUsedMs: DAILY_CAP_MS - 10 * MIN })
    expect(r).toMatchObject({ creditedMs: 10 * MIN, capped: true })
    expect(settleSegment({ lastCheckInAt: 0, nowMs: 30 * MIN, dailyUsedMs: DAILY_CAP_MS }).creditedMs).toBe(0)
  })

  it('total credit can never exceed wall-clock time, however often a client calls', () => {
    // Spam a check-in every 10s for 2 hours of wall time.
    let last = 0
    let total = 0
    for (let now = MIN_GAP_MS; now <= 2 * 60 * MIN; now += MIN_GAP_MS) {
      const r = settleSegment({ lastCheckInAt: last, nowMs: now })
      if (!r.tooSoon) { total += r.creditedMs; last = now }
    }
    expect(total).toBe(2 * 60 * MIN)   // exactly the wall time, never more
  })
})

describe('xpDelta', () => {
  it('awards whole minutes with no rounding loss across calls', () => {
    // 90s then 90s = 3 minutes total -> 1 XP, then 2 XP, never 1+1.
    expect(xpDelta(0, 90_000)).toBe(1)
    expect(xpDelta(90_000, 180_000)).toBe(2)
    expect(xpDelta(0, 59_999)).toBe(0)
  })
})

describe('bangkokDay', () => {
  it('rolls the day at 17:00 UTC (00:00 Bangkok)', () => {
    expect(bangkokDay(Date.UTC(2026, 9, 14, 16, 59, 59))).toBe('2026-10-14')
    expect(bangkokDay(Date.UTC(2026, 9, 14, 17, 0, 0))).toBe('2026-10-15')
  })
})
