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

import { getDoc, getDocs } from 'firebase/firestore'
import { auth } from '../firebase'
const { calculateMatchScore, useSocialStore } = await import('./useSocialStore')

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

describe('useSocialStore.searchUsers', () => {
  it('merges displayName and schoolName results, deduplicates by uid', async () => {
    auth.currentUser = { uid: 'me' }
    const userA = { uid: 'a', displayName: 'Alice' }
    const userB = { uid: 'b', displayName: 'Bob', schoolName: 'โรงเรียนสวนกุหลาบ' }

    // First getDocs call (name query) → userA
    // Second getDocs call (school query) → userB + userA (duplicate)
    getDocs
      .mockResolvedValueOnce({ docs: [{ data: () => userA }] })
      .mockResolvedValueOnce({ docs: [{ data: () => userB }, { data: () => userA }] })

    await useSocialStore.getState().searchUsers('test')

    const results = useSocialStore.getState().searchResults
    expect(results).toHaveLength(2)
    expect(results.map((u) => u.uid).sort()).toEqual(['a', 'b'])
  })
})

describe('loadMyProfile', () => {
  it('populates myProfile with the full doc, plus the social arrays', async () => {
    auth.currentUser = { uid: 'me' }
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        schoolId: 'school-1', schoolName: 'Test School', photoURL: 'https://x',
        following: ['a'], followers: ['b'], followRequests: ['c'], sentRequests: ['d'],
      }),
    })
    await useSocialStore.getState().loadMyProfile()
    const state = useSocialStore.getState()
    expect(state.myProfile).toMatchObject({ schoolId: 'school-1', schoolName: 'Test School', photoURL: 'https://x' })
    expect(state.following).toEqual(['a'])
    expect(state.followers).toEqual(['b'])
    expect(state.pendingRequests).toEqual(['c'])
    expect(state.sentRequests).toEqual(['d'])
  })

  it('does nothing when the doc does not exist', async () => {
    auth.currentUser = { uid: 'me' }
    useSocialStore.setState({ myProfile: null })
    getDoc.mockResolvedValueOnce({ exists: () => false })
    await useSocialStore.getState().loadMyProfile()
    expect(useSocialStore.getState().myProfile).toBeNull()
  })
})
