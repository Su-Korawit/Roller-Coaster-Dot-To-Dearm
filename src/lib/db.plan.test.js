import { describe, it, expect, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})), doc: vi.fn(() => ({})), query: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
}))

const { shapes } = await import('./db')

const v2 = {
  id: 'plan-1', v: 2, addedAt: 5, university: 'u1', program: 'p1', universityId: 'u1', universityName: 'จุฬาฯ',
  programId: 'p1', programName: 'แพทย์', buildingId: 'med', round: 3, rank: 2, projectName: null,
  scores: [{ key: 'tpat1', label: 'TPAT1', weight: 30 }], minGpax: 2.5,
  checklist: [{ id: 'auto:gpax', text: 'GPAX ≥ 2.5', done: true, source: 'auto' }],
}

describe('plan entries in the profile document', () => {
  it('writes v2 entries with their round, rank, scores and checklist, and reads them back', () => {
    const profile = shapes.profileFields({ plans: [v2], activePlanId: 'plan-1', goalHours: { a_lv_66: 40 } })
    expect(profile.plans[0]).toEqual(v2)
    expect(profile.goalHours).toEqual({ a_lv_66: 40 })
    const read = shapes.readProfile({ profile })
    expect(read.plans[0]).toEqual(v2)
    expect(read.goalHours).toEqual({ a_lv_66: 40 })
  })

  it('keeps writing old entries in the old four-field shape (onboarding and profile still read them)', () => {
    const profile = shapes.profileFields({ plans: [{ id: 'a', university: 'u', program: 'p', addedAt: 1 }] })
    expect(profile.plans).toEqual([{ id: 'a', university: 'u', program: 'p', addedAt: 1 }])
  })

  it('never writes undefined (Firestore rejects it)', () => {
    const profile = shapes.profileFields({ plans: [{ id: 'a', v: 2, university: 'u', program: 'p' }], activePlanId: 'a' })
    expect(JSON.stringify(profile)).not.toContain('undefined')
    for (const v of Object.values(profile.plans[0])) expect(v).not.toBeUndefined()
  })

  it('omits goalHours when there are none', () => {
    expect(shapes.profileFields({ plans: [v2], activePlanId: 'plan-1' }).goalHours).toBeUndefined()
    expect(shapes.readProfile({ profile: { mbti: 'INTJ' } }).goalHours).toBeUndefined()
  })
})
