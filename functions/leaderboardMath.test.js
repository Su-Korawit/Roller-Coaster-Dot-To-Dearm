import { describe, it, expect } from 'vitest'
import math from './leaderboardMath.js'

const { MIN_CONTRIBUTORS, weekInfo, aggregateSchools } = math
const H = 60 * 60 * 1000

describe('weekInfo (ISO week, Asia/Bangkok)', () => {
  it('Wed 2026-10-14 is 2026-W42, Mon 12th .. Sun 18th', () => {
    const w = weekInfo(Date.UTC(2026, 9, 14, 3, 0, 0))
    expect(w.week).toBe('2026-W42')
    expect(w.days[0]).toBe('2026-10-12')
    expect(w.days[6]).toBe('2026-10-18')
    expect(w.days).toHaveLength(7)
  })

  it('handles year boundaries per ISO (Thursday rule)', () => {
    expect(weekInfo(Date.UTC(2026, 0, 1, 3)).week).toBe('2026-W01')    // Thu Jan 1
    expect(weekInfo(Date.UTC(2025, 11, 29, 3)).week).toBe('2026-W01')  // Mon Dec 29 2025 belongs to 2026-W01
    expect(weekInfo(Date.UTC(2021, 0, 3, 3)).week).toBe('2020-W53')    // Sun Jan 3 2021
  })

  it('rolls the week at Sunday 17:00 UTC (Monday 00:00 Bangkok)', () => {
    expect(weekInfo(Date.UTC(2026, 9, 18, 16, 59, 59)).week).toBe('2026-W42')
    expect(weekInfo(Date.UTC(2026, 9, 18, 17, 0, 0)).week).toBe('2026-W43')
  })

  it('endsAtMs is the instant the next week starts', () => {
    const w = weekInfo(Date.UTC(2026, 9, 14, 3))
    expect(w.endsAtMs).toBe(Date.UTC(2026, 9, 18, 17, 0, 0))
    expect(weekInfo(w.endsAtMs).week).toBe('2026-W43')
    expect(weekInfo(w.endsAtMs - 1).week).toBe('2026-W42')
  })
})

describe('aggregateSchools', () => {
  const rows = (schoolId, n, hoursEach) =>
    Array.from({ length: n }, (_, i) => ({ uid: `${schoolId}-u${i}`, schoolId, verifiedMs: hoursEach * H }))

  it('ranks only schools with >= MIN_CONTRIBUTORS distinct students', () => {
    const out = aggregateSchools([...rows('big', MIN_CONTRIBUTORS, 2), ...rows('small', MIN_CONTRIBUTORS - 1, 9)], {})
    expect(out.find((s) => s.schoolId === 'big').ranked).toBe(true)
    expect(out.find((s) => s.schoolId === 'small').ranked).toBe(false)
  })

  it('counts a student once even across several days', () => {
    const r = [1, 2, 3].map((d) => ({ uid: 'u1', schoolId: 'S', verifiedMs: H, day: `d${d}` }))
    const [s] = aggregateSchools(r, {})
    expect(s.contributors).toBe(1)
    expect(s.totalMs).toBe(3 * H)
  })

  it('divides by registered members, so a school wins by getting everyone studying', () => {
    // A: 10 students x 5h, 10 registered   -> 5.0 h/member
    // B: 10 students x 5h, 100 registered  -> 0.5 h/member
    const out = aggregateSchools(
      [...rows('A', 10, 5), ...rows('B', 10, 5)],
      { A: { name: 'A', memberCount: 10 }, B: { name: 'B', memberCount: 100 } },
    )
    expect(out.find((s) => s.schoolId === 'A').avgHoursPerMember).toBe(5)
    expect(out.find((s) => s.schoolId === 'B').avgHoursPerMember).toBe(0.5)
  })

  it('never lets memberCount fall below contributors (stale counter)', () => {
    const [s] = aggregateSchools(rows('S', 12, 1), { S: { memberCount: 3 } })
    expect(s.memberCount).toBe(12)
    expect(s.avgHoursPerMember).toBe(1)
  })

  it('ignores rows with no school or no verified time, and truncates long names', () => {
    const out = aggregateSchools(
      [{ uid: 'a', schoolId: null, verifiedMs: H }, { uid: 'b', schoolId: 'S', verifiedMs: 0 }, ...rows('L', 1, 1)],
      { L: { name: 'x'.repeat(200), memberCount: 1 } },
    )
    expect(out).toHaveLength(1)
    expect(out[0].schoolName).toHaveLength(80)
  })
})
