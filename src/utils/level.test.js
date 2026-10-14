import { describe, it, expect } from 'vitest'
import { xpForLevel, levelFromXp, levelProgress, MAX_LEVEL } from './level'
import { TEMPERAMENT_BY_MBTI, TEMPERAMENTS, temperamentOf } from '../constants/temperaments'
import fn from '../../functions/temperaments.js'

describe('levels', () => {
  it('xpForLevel follows 30·n·(n−1)', () => {
    expect([1, 2, 3, 4, 5, 10].map(xpForLevel)).toEqual([0, 60, 180, 360, 600, 2700])
  })

  it('levelFromXp is exact on every boundary (no float drift) up to the cap', () => {
    for (let n = 1; n <= MAX_LEVEL; n++) {
      expect(levelFromXp(xpForLevel(n)), `at level ${n}`).toBe(n)
      if (n > 1) expect(levelFromXp(xpForLevel(n) - 1), `just below level ${n}`).toBe(n - 1)
    }
  })

  it('handles zero, negatives, NaN and absurdly large XP', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(-5)).toBe(1)
    expect(levelFromXp(NaN)).toBe(1)
    expect(levelFromXp(undefined)).toBe(1)
    expect(levelFromXp(1e12)).toBe(MAX_LEVEL)
  })

  it('levelProgress reports the ratio through the current level', () => {
    expect(levelProgress(0)).toMatchObject({ level: 1, floor: 0, next: 60, ratio: 0 })
    expect(levelProgress(30)).toMatchObject({ level: 1, ratio: 0.5 })
    expect(levelProgress(60)).toMatchObject({ level: 2, floor: 60, next: 180, ratio: 0 })
    expect(levelProgress(1e12)).toMatchObject({ level: MAX_LEVEL, next: null, ratio: 1 })
  })
})

describe('temperaments (client display vs server rules)', () => {
  it('the MBTI -> temperament map is identical on client and server', () => {
    expect(TEMPERAMENT_BY_MBTI).toEqual(fn.TEMPERAMENT_BY_MBTI)
  })

  it('every temperament has Thai copy, and the descriptions quote the server thresholds', () => {
    for (const t of Object.values(TEMPERAMENTS)) {
      expect(t.name && t.perk && t.description && t.emoji).toBeTruthy()
    }
    expect(TEMPERAMENTS.NT.description).toContain(String(fn.DEEP_FOCUS_MS / 60000))
    expect(TEMPERAMENTS.SP.description).toContain(String(fn.SPRINT_DAILY_MS / 60000))
    expect(TEMPERAMENTS.SJ.description).toContain(String(fn.YESTERDAY_MIN_MS / 60000))
    expect(TEMPERAMENTS.NF.description).toContain(`${fn.NIGHT_FROM_HOUR}:00`)
    expect(fn.PERK_BONUS).toBe(0.1)
  })

  it('temperamentOf resolves case-insensitively and rejects junk', () => {
    expect(temperamentOf('enfp').id).toBe('NF')
    expect(temperamentOf('nope')).toBeNull()
    expect(temperamentOf(null)).toBeNull()
  })
})
