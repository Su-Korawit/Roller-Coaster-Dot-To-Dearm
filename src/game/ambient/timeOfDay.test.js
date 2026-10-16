import { describe, it, expect } from 'vitest'
import { phaseAt, PHASE_TINT } from './timeOfDay'

describe('phaseAt (Asia/Bangkok)', () => {
  it.each([
    ['2026-10-16T01:00:00Z', 'morning'], // 08:00
    ['2026-10-16T03:00:00Z', 'day'], // 10:00
    ['2026-10-16T09:29:59Z', 'day'], // 16:29:59
    ['2026-10-16T09:30:00Z', 'golden'], // 16:30
    ['2026-10-16T11:59:59Z', 'golden'], // 18:59:59
    ['2026-10-16T12:00:00Z', 'night'], // 19:00
    ['2026-10-15T21:59:00Z', 'night'], // 04:59
    ['2026-10-15T22:00:00Z', 'morning'], // 05:00
  ])('%s → %s', (iso, phase) => {
    expect(phaseAt(new Date(iso))).toBe(phase)
  })

  it('does not depend on the host time zone', () => {
    const prev = process.env.TZ
    try {
      process.env.TZ = 'America/Los_Angeles'
      expect(phaseAt(new Date('2026-10-16T09:30:00Z'))).toBe('golden')
    } finally {
      if (prev === undefined) delete process.env.TZ
      else process.env.TZ = prev
    }
  })
})

describe('PHASE_TINT', () => {
  it('defines a tint for every phase', () => {
    expect(PHASE_TINT.morning).toEqual({ color: '#FFE7C2', alpha: 0.1 })
    expect(PHASE_TINT.day).toEqual({ color: '#FFFFFF', alpha: 0 })
    expect(PHASE_TINT.golden).toEqual({ color: '#F6BFA6', alpha: 0.18 })
    expect(PHASE_TINT.night).toEqual({ color: '#2B2550', alpha: 0.35 })
  })
})
