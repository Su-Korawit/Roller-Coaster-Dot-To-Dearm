import { describe, it, expect, vi } from 'vitest'

vi.mock('../firebase', () => ({ auth: { currentUser: null }, db: {} }))
vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
  setDoc: vi.fn(),
  writeBatch: vi.fn(),
  arrayRemove: vi.fn(),
  arrayUnion: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}))

const { calculateMatchScore } = await import('./useSocialStore')

describe('calculateMatchScore (through the profile shape seam)', () => {
  it('scores 40 for an exact program match on nested profile.*', () => {
    expect(calculateMatchScore({ profile: { program: 'cs' } }, { profile: { program: 'cs' } })).toBe(40)
  })

  it('still matches a legacy top-level doc against a nested one (fallback)', () => {
    expect(calculateMatchScore({ program: 'cs' }, { profile: { program: 'cs' } })).toBe(40)
  })

  it('sums program + mastery + mbti + university (masteryTrack canonical)', () => {
    const a = { profile: { program: 'cs', masteryTrack: 'adv', mbti: 'INTJ', university: 'cu' } }
    const b = { profile: { program: 'cs', masteryTrack: 'adv', mbti: 'INTJ', university: 'cu' } }
    // 40 + 25 + 15 + 10 = 90
    expect(calculateMatchScore(a, b)).toBe(90)
  })

  it('bridges legacy mastery name to masteryTrack', () => {
    // one side legacy top-level `mastery`, other side nested `masteryTrack`
    expect(calculateMatchScore({ mastery: 'adv' }, { profile: { masteryTrack: 'adv' } })).toBe(25)
  })
})
