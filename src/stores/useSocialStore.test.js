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
  updateDoc: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn((...args) => ({ _path: args.slice(1).join('/') })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}))

import { getDoc, getDocs, updateDoc } from 'firebase/firestore'
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

describe('saveSchool', () => {
  it('writes schoolData to refs.user(uid) and merges it into myProfile', async () => {
    useSocialStore.setState({ myProfile: { displayName: 'Me', schoolId: null } })
    const schoolData = { schoolId: 'school-2', schoolName: 'New School', schoolLat: 1, schoolLng: 2 }
    await useSocialStore.getState().saveSchool('uid-1', schoolData)
    expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ _path: 'users/uid-1' }), schoolData)
    expect(useSocialStore.getState().myProfile).toEqual({ displayName: 'Me', schoolId: 'school-2', schoolName: 'New School', schoolLat: 1, schoolLng: 2 })
  })
})

describe('hydrateRequestUsers', () => {
  it('resolves each uid to its user doc and merges into requestUsers', async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ uid: 'uid-1', displayName: 'Alice' }) })
      .mockResolvedValueOnce({ exists: () => false })
    await useSocialStore.getState().hydrateRequestUsers(['uid-1', 'uid-2'])
    expect(useSocialStore.getState().requestUsers).toEqual({
      'uid-1': { uid: 'uid-1', displayName: 'Alice' },
    })
  })
})
