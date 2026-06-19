import { describe, it, expect, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_, ...path) => ({ _col: path.join('/') })),
  doc: vi.fn((_, ...path) => ({ _path: path.join('/') })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
}))

const { shapes, refs, cols, prefixUpperBound } = await import('./db')

describe('shapes.readProfile', () => {
  it('reads canonical nested profile.* fields', () => {
    const userDoc = {
      profile: { mbti: 'INTJ', program: 'CS', career: 'eng', masteryTrack: 'advanced', university: 'CU' },
    }
    expect(shapes.readProfile(userDoc)).toEqual({
      mbti: 'INTJ',
      program: 'CS',
      career: 'eng',
      masteryTrack: 'advanced',
      university: 'CU',
    })
  })

  it('falls back to legacy top-level fields, mapping mastery to masteryTrack', () => {
    const legacyDoc = { mbti: 'ENFP', program: 'Med', university: 'MU', mastery: 'beginner' }
    const r = shapes.readProfile(legacyDoc)
    expect(r.mbti).toBe('ENFP')
    expect(r.program).toBe('Med')
    expect(r.university).toBe('MU')
    expect(r.masteryTrack).toBe('beginner')
  })

  it('prefers nested over legacy when both exist', () => {
    const doc = { mbti: 'OLD', profile: { mbti: 'NEW' } }
    expect(shapes.readProfile(doc).mbti).toBe('NEW')
  })
})

describe('shapes.profileFields', () => {
  it('keeps only non-empty fields and maps mastery to masteryTrack', () => {
    expect(shapes.profileFields({ mbti: 'INTJ', career: '', mastery: 'advanced', university: null, program: 'CS' }))
      .toEqual({ mbti: 'INTJ', masteryTrack: 'advanced', program: 'CS' })
  })
})

describe('refs.map', () => {
  it('builds a maps/{uid} document ref', () => {
    expect(refs.map('uid-abc')).toEqual({ _path: 'maps/uid-abc' })
  })
})

describe('cols.maps', () => {
  it('is the maps collection ref', () => {
    expect(cols.maps).toEqual({ _col: 'maps' })
  })
})

describe('prefixUpperBound', () => {
  it('appends U+F8FF for Firestore prefix range upper bound', () => {
    expect(prefixUpperBound('test')).toBe('test')
  })

  it('appends U+F8FF to empty string', () => {
    expect(prefixUpperBound('')).toBe('')
  })
})