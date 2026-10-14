import { describe, it, expect } from 'vitest'
import helpers from './schoolMembers.js'

const { schoolMemberDeltas, normalizeSchoolId } = helpers

describe('schoolMemberDeltas', () => {
  it('is a no-op when the school did not change (coins/streak writes)', () => {
    expect(schoolMemberDeltas({ schoolId: 'A', coins: 1 }, { schoolId: 'A', coins: 2 })).toEqual([])
    expect(schoolMemberDeltas({}, {})).toEqual([])
  })
  it('adds a member on first school selection', () => {
    expect(schoolMemberDeltas({ schoolId: null }, { schoolId: 'A' })).toEqual([{ schoolId: 'A', delta: 1 }])
  })
  it('moves a member between schools', () => {
    expect(schoolMemberDeltas({ schoolId: 'A' }, { schoolId: 'B' }))
      .toEqual([{ schoolId: 'A', delta: -1 }, { schoolId: 'B', delta: 1 }])
  })
  it('removes a member when the user doc is deleted or school cleared', () => {
    expect(schoolMemberDeltas({ schoolId: 'A' }, undefined)).toEqual([{ schoolId: 'A', delta: -1 }])
    expect(schoolMemberDeltas({ schoolId: 'A' }, { schoolId: null })).toEqual([{ schoolId: 'A', delta: -1 }])
  })
  it('creates a member when a user doc is created with a school', () => {
    expect(schoolMemberDeltas(undefined, { schoolId: 'A' })).toEqual([{ schoolId: 'A', delta: 1 }])
  })
  it('ignores ids unsafe for RTDB keys', () => {
    expect(normalizeSchoolId({ schoolId: 'a:b' })).toBeNull()
    expect(schoolMemberDeltas({}, { schoolId: 'a/b' })).toEqual([])
  })
})
