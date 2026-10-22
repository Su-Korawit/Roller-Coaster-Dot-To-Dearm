import { describe, it, expect } from 'vitest'
import {
  isSubjectKey, autoChecklist, mergeChecklist, aggregateSubjects, defaultGoalHours,
  roundStatus, nextFreeRank, normalizeRanks, migrateEntry, nextUp, RANK_MAX,
} from './planDerive'

const med = { key: 'tpat1', label: 'TPAT1 วิชาเฉพาะกสพท', weight: 30 }
const bio = { key: 'a_lv_66', label: 'A-Level ชีววิทยา', weight: 70 }
const chem = { key: 'a_lv_65', label: 'A-Level เคมี', weight: 30 }

const entry = (over = {}) => ({
  id: 'e1', v: 2, programId: 'p1', universityId: 'u1', round: 3, rank: 1, scores: [med, bio], minGpax: 2.5, checklist: [], ...over,
})

describe('isSubjectKey', () => {
  it.each(['tgat', 'tgat1', 'tpat1', 'tpat11', 'tpat21', 'a_lv_61', 'a_lv_89'])('accepts %s', (k) => expect(isSubjectKey(k)).toBe(true))
  it.each(['gpax', 'gpax6_score', 'portfolio', 'interview', 'priority_score', 'gpa22', '', null, undefined, 5, '__proto__', 'a/b', 'a_lv_6', 'x'.repeat(65)])('rejects %j', (k) => expect(isSubjectKey(k)).toBe(false))
})

describe('autoChecklist', () => {
  it('makes a GPAX item, one item per exam subject, and nothing for non-exam score keys', () => {
    const items = autoChecklist({ round: 3, minGpax: 2.5, scores: [med, bio, { key: 'gpax', label: 'GPAX', weight: 0 }] })
    expect(items.map((i) => i.text)).toEqual(['GPAX ≥ 2.5', 'สอบ TPAT1 วิชาเฉพาะกสพท', 'สอบ A-Level ชีววิทยา'])
    expect(items.every((i) => i.source === 'auto' && i.done === false)).toBe(true)
    expect(items.map((i) => i.id)).toEqual(['auto:gpax', 'auto:tpat1', 'auto:a_lv_66'])
  })

  it('round 1 adds a portfolio item, an interview key adds an interview item', () => {
    const r1 = autoChecklist({ round: 1, minGpax: null, scores: [{ key: 'portfolio', label: 'Portfolio', weight: 50 }, { key: 'interview', label: 'สัมภาษณ์', weight: 50 }] })
    expect(r1.map((i) => i.text)).toEqual(['เตรียม Portfolio', 'สัมภาษณ์'])
  })

  it('round 1 without a portfolio key still prepares a portfolio; no minGpax means no GPAX item', () => {
    expect(autoChecklist({ round: 1, minGpax: null, scores: [] }).map((i) => i.text)).toEqual(['เตรียม Portfolio'])
  })

  it('is empty for no data and never throws on junk', () => {
    expect(autoChecklist({ round: 3, minGpax: null, scores: [] })).toEqual([])
    expect(autoChecklist({ round: 3, minGpax: 'x', scores: 'nope' })).toEqual([])
    expect(autoChecklist(undefined)).toEqual([])
  })
})

describe('mergeChecklist', () => {
  it('keeps what was ticked, keeps the student’s own items, drops auto items that no longer apply', () => {
    const existing = [
      { id: 'auto:gpax', text: 'GPAX ≥ 2.5', done: true, source: 'auto' },
      { id: 'auto:old', text: 'สอบ เก่า', done: false, source: 'auto' },
      { id: 'u1', text: 'ซื้อชีท', done: true, source: 'user' },
    ]
    const generated = autoChecklist({ round: 3, minGpax: 3, scores: [bio] })
    const out = mergeChecklist(existing, generated)
    expect(out.map((i) => i.id)).toEqual(['auto:gpax', 'auto:a_lv_66', 'u1'])
    expect(out[0]).toMatchObject({ text: 'GPAX ≥ 3', done: true })
    expect(out.find((i) => i.id === 'u1').done).toBe(true)
  })
})

describe('aggregateSubjects', () => {
  it('unions score keys across entries, counts programs, sorts by programs then weight then label', () => {
    const entries = [
      entry({ id: 'a', scores: [med, bio] }),
      entry({ id: 'b', scores: [bio, chem], programId: 'p2' }),
      entry({ id: 'c', scores: [chem, { key: 'gpax', label: 'GPAX', weight: 10 }], programId: 'p3' }),
    ]
    const out = aggregateSubjects(entries)
    expect(out.map((s) => [s.key, s.programs, s.maxWeight])).toEqual([
      ['a_lv_66', 2, 70], ['a_lv_65', 2, 30], ['tpat1', 1, 30],
    ])
  })

  it('counts a program once even if it is in the plan under two rounds, and ignores entries without scores', () => {
    const out = aggregateSubjects([entry({ id: 'a', round: 1 }), entry({ id: 'b', round: 3 }), entry({ id: 'c', scores: undefined, programId: 'p9' })])
    expect(out.find((s) => s.key === 'a_lv_66').programs).toBe(1)
  })

  it('is empty for an empty plan', () => {
    expect(aggregateSubjects([])).toEqual([])
    expect(aggregateSubjects(undefined)).toEqual([])
  })
})

describe('defaultGoalHours', () => {
  it.each([[0, 20], [30, 40], [70, 60], [100, 80], [50, 50], [15, 30]])('weight %i → %i h', (w, h) => expect(defaultGoalHours(w)).toBe(h))
  it('treats junk as the base 20 h', () => {
    expect(defaultGoalHours(undefined)).toBe(20)
    expect(defaultGoalHours(-5)).toBe(20)
    expect(defaultGoalHours(500)).toBe(80)
  })
})

describe('roundStatus', () => {
  const events = [
    { id: 'r1', round: 1, kind: 'announce', date: '2027-03-10' },
    { id: 'r3', round: 3, kind: 'apply', date: '2027-05-07' },
  ]
  it('no projects means not announced', () => {
    expect(roundStatus({ round: 4, hasProjects: false, events, today: '2027-01-01' })).toBe('unannounced')
  })
  it('a past announcement for that round means closed, a future one means still open', () => {
    expect(roundStatus({ round: 1, hasProjects: true, events, today: '2027-03-11' })).toBe('closed')
    expect(roundStatus({ round: 1, hasProjects: true, events, today: '2027-03-10' })).toBe('closed')
    expect(roundStatus({ round: 1, hasProjects: true, events, today: '2027-03-09' })).toBe('open')
  })
  it('without calendar data a round with projects is open (no invented closing)', () => {
    expect(roundStatus({ round: 3, hasProjects: true, events: [], today: '2027-06-01' })).toBe('open')
    expect(roundStatus({ round: 3, hasProjects: true, events: undefined, today: '2027-06-01' })).toBe('open')
  })
})

describe('ranks', () => {
  const r3 = (rank, id = `e${rank}`) => entry({ id, rank, programId: `p${id}` })
  it('nextFreeRank is the smallest unused 1..10 among round-3 entries, or null when full', () => {
    expect(nextFreeRank([])).toBe(1)
    expect(nextFreeRank([r3(1), r3(2), r3(4)])).toBe(3)
    expect(nextFreeRank([entry({ round: 1, rank: null })])).toBe(1)
    expect(nextFreeRank(Array.from({ length: RANK_MAX }, (_, i) => r3(i + 1)))).toBeNull()
  })

  it('normalizeRanks closes gaps and fixes duplicates in current order, clears ranks outside round 3, caps at 10', () => {
    const out = normalizeRanks([
      r3(2, 'a'), r3(2, 'b'), entry({ id: 'c', round: 1, rank: 7 }), r3(9, 'd'),
    ])
    expect(out.map((e) => [e.id, e.round, e.rank])).toEqual([['a', 3, 1], ['b', 3, 2], ['c', 1, null], ['d', 3, 3]])
    const many = Array.from({ length: 12 }, (_, i) => r3(i + 1, `x${i}`))
    expect(normalizeRanks(many).filter((e) => e.round === 3).length).toBe(RANK_MAX)
  })
})

describe('migrateEntry', () => {
  it('upgrades an old {id, university, program} entry without losing it', () => {
    const out = migrateEntry({ id: 'plan-1', university: 'u1', program: 'p1', addedAt: 5 })
    expect(out).toMatchObject({ id: 'plan-1', v: 2, university: 'u1', program: 'p1', addedAt: 5, round: null, rank: null, projectName: null, scores: [], minGpax: null, checklist: [] })
  })
  it('keeps new fields, drops junk and is idempotent', () => {
    const e = entry({ checklist: [{ id: 'auto:gpax', text: 't', done: true, source: 'auto' }, { nope: 1 }], round: 9, rank: 99 })
    const out = migrateEntry(e)
    expect(out.checklist).toHaveLength(1)
    expect(out.round).toBeNull()
    expect(out.rank).toBeNull()
    expect(migrateEntry(out)).toEqual(out)
  })
  it('survives null and non-objects', () => {
    expect(migrateEntry(null)).toBeNull()
    expect(migrateEntry('x')).toBeNull()
  })
})

describe('nextUp', () => {
  const events = [
    { id: 'old', date: '2026-01-01', title: 'ผ่านไปแล้ว', round: 3 },
    { id: 'tgat', date: '2027-01-30', title: 'สอบ TGAT', kind: 'exam', examKeys: ['tgat', 'tpat1'] },
    { id: 'r3', date: '2027-05-07', title: 'รอบ 3 เปิดรับ', round: 3, kind: 'apply' },
    { id: 'r4', date: '2027-05-29', title: 'รอบ 4', round: 4 },
  ]
  const entries = [entry({ checklist: [{ id: 'a', text: 'x', done: true, source: 'auto' }, { id: 'b', text: 'y', done: false, source: 'auto' }] })]

  it('picks the nearest future event touching a plan entry (by exam key or round), with its countdown and progress', () => {
    const out = nextUp({ entries, events, today: '2027-01-20' })
    expect(out.event.id).toBe('tgat')
    expect(out.days).toBe(10)
    expect(out.progress).toEqual({ done: 1, total: 2 })
    expect(out.entries.map((e) => e.id)).toEqual(['e1'])
  })

  it('today counts as 0 days and past events are never next', () => {
    expect(nextUp({ entries, events, today: '2027-01-30' }).days).toBe(0)
    expect(nextUp({ entries, events, today: '2027-02-01' }).event.id).toBe('r3')
  })

  it('ignores events nothing in the plan touches, and an empty plan or calendar gives null', () => {
    expect(nextUp({ entries, events: [{ id: 'x', date: '2027-03-01', title: 'ไม่เกี่ยว', round: 2 }], today: '2027-01-01' })).toBeNull()
    expect(nextUp({ entries: [], events, today: '2027-01-01' })).toBeNull()
    expect(nextUp({ entries, events: [], today: '2027-01-01' })).toBeNull()
    expect(nextUp({ entries, events: undefined, today: '2027-01-01' })).toBeNull()
  })

  it('an entry with no round only matches by exam key', () => {
    const e = [entry({ round: null, rank: null, scores: [med] })]
    expect(nextUp({ entries: e, events, today: '2027-01-01' }).event.id).toBe('tgat')
    expect(nextUp({ entries: e, events, today: '2027-02-01' })).toBeNull()
  })
})
