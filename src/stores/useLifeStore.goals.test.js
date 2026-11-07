import { describe, it, expect, beforeEach } from 'vitest'
import { useLifeStore } from './useLifeStore'
import { makeGoal, MAX_GOALS } from '../os/goalLogic'

const mk = (n, extra = {}) => makeGoal({ source: 'mytcas', programId: `P${n}`, university: `U${n}`, faculty: `F${n}`, program: `Prog${n}`, reqs: [{ subject: 'TGAT1', needed: 60 }], ...extra })

beforeEach(() => useLifeStore.setState({ ownerUid: null, goals: [], primaryGoalId: null, scores: [], target: { university: '', faculty: '', major: '', interest: '', examDate: '2027-01-10' } }))

describe('goals', () => {
  it('first goal becomes primary and fills target + scores', () => {
    const g = mk(1)
    expect(useLifeStore.getState().addGoal(g)).toEqual({ ok: true })
    const s = useLifeStore.getState()
    expect(s.primaryGoalId).toBe(g.id)
    expect(s.target).toMatchObject({ university: 'U1', faculty: 'F1', major: 'Prog1', examDate: '2027-01-10' })
    expect(s.scores.map((x) => x.subject)).toEqual(['TGAT1'])
  })
  it('later goals do not change the primary; switching does', () => {
    const a = mk(1)
    const b = mk(2, { reqs: [{ subject: 'TPAT3', needed: 50 }] })
    useLifeStore.getState().addGoal(a)
    useLifeStore.getState().addGoal(b)
    expect(useLifeStore.getState().primaryGoalId).toBe(a.id)
    expect(useLifeStore.getState().target.major).toBe('Prog1')
    useLifeStore.getState().setPrimaryGoal(b.id)
    expect(useLifeStore.getState().target.major).toBe('Prog2')
    expect(useLifeStore.getState().scores.map((x) => x.subject)).toEqual(['TPAT3'])
  })
  it('refuses duplicates and more than MAX_GOALS', () => {
    useLifeStore.getState().addGoal(mk(1))
    expect(useLifeStore.getState().addGoal(mk(1))).toEqual({ ok: false, reason: 'duplicate' })
    for (let i = 2; i <= MAX_GOALS; i++) useLifeStore.getState().addGoal(mk(i))
    expect(useLifeStore.getState().addGoal(mk(99))).toEqual({ ok: false, reason: 'full' })
    expect(useLifeStore.getState().goals).toHaveLength(MAX_GOALS)
  })
  it('removing the primary promotes the next goal; removing the last clears primary', () => {
    const a = mk(1)
    const b = mk(2)
    useLifeStore.getState().addGoal(a)
    useLifeStore.getState().addGoal(b)
    useLifeStore.getState().removeGoal(a.id)
    expect(useLifeStore.getState().primaryGoalId).toBe(b.id)
    expect(useLifeStore.getState().target.major).toBe('Prog2')
    useLifeStore.getState().removeGoal(b.id)
    expect(useLifeStore.getState().primaryGoalId).toBeNull()
    expect(useLifeStore.getState().goals).toEqual([])
  })
})
