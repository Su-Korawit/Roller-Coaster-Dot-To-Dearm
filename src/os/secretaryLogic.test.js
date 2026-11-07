import { describe, it, expect } from 'vitest'
import { greeting, proactiveItems, rescheduleOpen, pushHistory, MAX_HISTORY } from './secretaryLogic'

const today = '2027-01-10'

describe('greeting', () => {
  it('follows the hour', () => {
    expect(greeting(8)).toContain('อรุณ')
    expect(greeting(14)).toContain('บ่าย')
    expect(greeting(19)).toContain('เย็น')
    expect(greeting(2)).toContain('ดึก')
  })
})

describe('proactiveItems', () => {
  const base = { today, examDate: '2027-01-30', hour: 10 }
  it('asks for a goal first when there is none', () => {
    const r = proactiveItems({ ...base, tasks: [], goals: [], scores: [] })
    expect(r).toHaveLength(1)
    expect(r[0].open).toBe('goal')
  })
  it('offers to build a plan, and to postpone open tasks (needs confirm)', () => {
    const r = proactiveItems({ ...base, goals: [{}], scores: [{ subject: 'TGAT1' }], tasks: [{ id: 1, date: today, done: false }] })
    expect(r.map((x) => x.id)).toEqual(['plan', 'today'])
    expect(r.every((x) => x.confirm)).toBe(true)
  })
  it('praises a finished day and stays quiet about the plan when one exists', () => {
    const r = proactiveItems({ ...base, goals: [{}], scores: [{ subject: 'TGAT1' }], tasks: [{ id: 1, date: today, done: true, auto: true }] })
    expect(r.map((x) => x.id)).toEqual(['done'])
  })
  it('evening wording differs', () => {
    const r = proactiveItems({ ...base, hour: 19, goals: [{}], scores: [{ subject: 'x' }], tasks: [{ id: 1, date: today, done: false, auto: true }] })
    expect(r[0].text).toContain('เย็น')
  })
})

describe('rescheduleOpen', () => {
  it('moves only today\'s unfinished tasks to tomorrow', () => {
    const out = rescheduleOpen([
      { id: 'a', date: today, done: false }, { id: 'b', date: today, done: true }, { id: 'c', date: '2027-01-12', done: false },
    ], today)
    expect(out.map((t) => t.date)).toEqual(['2027-01-11', today, '2027-01-12'])
  })
})

describe('pushHistory', () => {
  it('puts newest first and caps the list', () => {
    let h = []
    for (let i = 0; i < MAX_HISTORY + 5; i++) h = pushHistory(h, { id: i })
    expect(h).toHaveLength(MAX_HISTORY)
    expect(h[0].id).toBe(MAX_HISTORY + 4)
  })
})
