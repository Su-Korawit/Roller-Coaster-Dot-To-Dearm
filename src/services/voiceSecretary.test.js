import { describe, it, expect } from 'vitest'
import { buildStudyPlan } from './voiceSecretary'

describe('buildStudyPlan', () => {
  it('returns empty string when there is no plan (server falls back politely)', () => {
    expect(buildStudyPlan([])).toBe('')
    expect(buildStudyPlan(undefined)).toBe('')
  })
  it('orders by rank, caps at 3 and includes the round', () => {
    const plans = [
      { programName: 'D', universityName: 'u4', rank: 4 },
      { programName: 'A', universityName: 'u1', rank: 1, round: 3 },
      { programName: 'B', universityName: 'u2', rank: 2 },
      { programName: 'C', universityName: 'u3', rank: 3 },
    ]
    expect(buildStudyPlan(plans)).toBe('A u1 (รอบ 3); B u2; C u3')
  })
})
