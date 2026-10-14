import { describe, it, expect } from 'vitest'
import helpers from './teacherClaims.js'

const { nextClaims } = helpers

describe('nextClaims', () => {
  it('grants the teacher claim pair and keeps unrelated claims', () => {
    expect(nextClaims({ beta: true }, { schoolId: 'ChIJabc' }))
      .toEqual({ beta: true, teacher: true, teacherSchoolId: 'ChIJabc' })
  })

  it('moves a teacher to another school (re-grant replaces the school)', () => {
    expect(nextClaims({ teacher: true, teacherSchoolId: 'A' }, { schoolId: 'B' }))
      .toEqual({ teacher: true, teacherSchoolId: 'B' })
  })

  it('revokes only the teacher claims', () => {
    expect(nextClaims({ beta: true, teacher: true, teacherSchoolId: 'A' }, { revoke: true })).toEqual({ beta: true })
    expect(nextClaims(undefined, { revoke: true })).toEqual({})
  })

  it('refuses a grant without a usable school id (never grant a school-less teacher)', () => {
    for (const bad of [undefined, '', 'a:b', 'a/b', 42]) {
      expect(() => nextClaims({}, { schoolId: bad })).toThrow('INVALID_SCHOOL')
    }
  })

  it('does not mutate its input', () => {
    const input = { teacher: true, teacherSchoolId: 'A' }
    nextClaims(input, { revoke: true })
    expect(input).toEqual({ teacher: true, teacherSchoolId: 'A' })
  })
})
