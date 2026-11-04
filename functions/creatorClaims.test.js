import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { nextCreatorClaims } = require('./creatorClaims.js')

describe('nextCreatorClaims', () => {
  it('adds creator and keeps unrelated claims', () => {
    expect(nextCreatorClaims({ teacher: true, teacherSchoolId: 'S1' }, {})).toEqual({
      teacher: true,
      teacherSchoolId: 'S1',
      creator: true,
    })
  })

  it('works with no existing claims', () => {
    expect(nextCreatorClaims(undefined, {})).toEqual({ creator: true })
    expect(nextCreatorClaims(null, { revoke: false })).toEqual({ creator: true })
  })

  it('revoke removes only the creator claim', () => {
    expect(nextCreatorClaims({ creator: true, teacher: true }, { revoke: true })).toEqual({ teacher: true })
    expect(nextCreatorClaims({}, { revoke: true })).toEqual({})
  })

  it('does not mutate its input', () => {
    const existing = { teacher: true }
    nextCreatorClaims(existing, {})
    expect(existing).toEqual({ teacher: true })
  })
})
