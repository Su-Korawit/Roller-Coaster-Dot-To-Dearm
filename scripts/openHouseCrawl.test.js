import { describe, it, expect, vi } from 'vitest'
import { buildIndex, formatProgramRounds, shouldReplaceIndex, indexVerdict } from './openHouseCrawl.mjs'

const YEAR = 2570
const course = (over = {}) => ({
  program_id: 'p1', program_name_th: 'แพทยศาสตรบัณฑิต', program_type_name_th: 'ปกติ', field_name_th: 'แพทยศาสตร์',
  faculty_name_th: 'คณะแพทยศาสตร์', group_field_id: '10', cost: '34,000/ภาค', major_id: '0',
  university_id: 'u1', university_name_th: 'จุฬาลงกรณ์มหาวิทยาลัย', university_type_name_th: 'ทปอ.', ...over,
})
const project = (over = {}) => ({
  type: `3_${YEAR}`, project_id: 'x1', project_name_th: 'โครงการ A', receive_student_number: 24, min_gpax: 3.5,
  scores: { tpat1: 30, a_lv_66: 70 }, link: 'https://mytcas.com/x', interview_location: '-', ...over,
})
const noSleep = async () => {}
const run = (rows, fetchRounds, extra = {}) => buildIndex({ rows, fetchRounds, year: YEAR, now: () => Date.UTC(2026, 9, 16, 3), sleep: noSleep, ...extra })

describe('formatProgramRounds', () => {
  it('groups projects by round for the current year only, with labelled score weights and seat totals', () => {
    const rounds = formatProgramRounds([
      project(),
      project({ project_id: 'x2', project_name_th: 'โครงการ B', receive_student_number: 6, scores: { gpax: 100 } }),
      project({ type: `1_${YEAR}`, project_name_th: 'พอร์ต', receive_student_number: 10, scores: { portfolio: 60, interview: 40 } }),
      project({ type: '3_2569', project_name_th: 'ปีที่แล้ว' }),
    ], YEAR)
    expect(rounds.map((r) => [r.round, r.seats, r.projects.length])).toEqual([[1, 10, 1], [3, 30, 2]])
    expect(rounds[1].projects[0]).toMatchObject({ nameTh: 'โครงการ A', seats: 24, minGpax: 3.5, link: 'https://mytcas.com/x', interview: false })
    expect(rounds[1].projects[0].scores).toEqual([{ key: 'tpat1', label: 'TPAT1 วิชาเฉพาะกสพท', weight: 30 }, { key: 'a_lv_66', label: 'A-Level ชีววิทยา', weight: 70 }])
    expect(rounds[0].projects[0].interview).toBe(true)
  })

  it('treats "0" names, "-" interview places and missing numbers safely', () => {
    const [r] = formatProgramRounds([project({ project_name_th: '0', receive_student_number: undefined, min_gpax: null, link: undefined, interview_location: 'อาคาร 1' })], YEAR)
    expect(r.projects[0]).toMatchObject({ nameTh: null, seats: 0, minGpax: null, link: null, interview: true })
  })

  it('ignores malformed rows and non-arrays', () => {
    expect(formatProgramRounds(undefined, YEAR)).toEqual([])
    expect(formatProgramRounds([null, {}, { type: 'junk' }, { type: '9_2570' }], YEAR)).toEqual([])
  })
})

describe('buildIndex', () => {
  const rows = [
    course(),
    course({ program_id: 'p1', major_id: '5', major_name_th: 'เอก' }), // duplicate row for the same program
    course({ program_id: 'p2', program_name_th: 'ทันตแพทยศาสตร์', group_field_id: '12', university_id: 'u2', university_name_th: 'มหิดล' }),
    course({ program_id: 'p3', program_name_th: 'นิติศาสตร์', group_field_id: '90', field_name_th: 'นิติศาสตร์' }),
    course({ program_id: 'p4', group_field_id: '99' }), // no building for this group
    course({ program_id: 'p5', university_id: '' }), // no university
  ]
  const fetchRounds = vi.fn(async (id) => (id === 'p1' ? [project()] : id === 'p2' ? [project({ type: `1_${YEAR}` })] : []))

  it('classifies, dedupes and groups programs by building and university', async () => {
    const { index, buildings } = await run(rows, fetchRounds)
    expect(Object.keys(buildings).sort()).toEqual(['dent', 'law', 'med'])
    expect(buildings.med.universities).toHaveLength(1)
    expect(buildings.med.universities[0]).toMatchObject({ id: 'u1', nameTh: 'จุฬาลงกรณ์มหาวิทยาลัย', typeTh: 'ทปอ.', logoUrl: 'https://assets.mytcas.com/i/logo/u1.png' })
    expect(buildings.med.universities[0].programs).toEqual([
      expect.objectContaining({ programId: 'p1', nameTh: 'แพทยศาสตรบัณฑิต', typeTh: 'ปกติ', costText: '34,000/ภาค' }),
    ])
    expect(index.tcasYear).toBe(YEAR)
    expect(index.updatedAt).toBe('2026-10-16T03:00:00.000Z')
    expect(index.skipped).toBe(2)
  })

  it('summarises each building for the index file', async () => {
    const { index } = await run(rows, fetchRounds)
    expect(index.buildings.med).toEqual({ programs: 1, universities: 1, withRounds: 1, rounds: { 1: { universities: 0, seats: 0 }, 2: { universities: 0, seats: 0 }, 3: { universities: 1, seats: 24 }, 4: { universities: 0, seats: 0 } } })
    expect(index.buildings.dent.rounds[1]).toEqual({ universities: 1, seats: 24 })
    expect(index.buildings.law.programs).toBe(1)
  })

  it('asks the upstream once per program, never for skipped rows', async () => {
    fetchRounds.mockClear()
    await run(rows, fetchRounds)
    expect(fetchRounds.mock.calls.map((c) => c[0]).sort()).toEqual(['p1', 'p2', 'p3'])
  })

  it('retries a failing program with backoff, then records it as having no rounds without aborting the run', async () => {
    const sleep = vi.fn(async () => {})
    let tries = 0
    const flaky = vi.fn(async (id) => {
      if (id === 'p1') {
        tries += 1
        throw new Error('503')
      }
      return []
    })
    const { index, buildings } = await run(rows, flaky, { sleep, retries: 3 })
    expect(tries).toBe(3)
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([250, 500])
    expect(index.failed).toBe(1)
    expect(buildings.med.universities[0].programs[0].rounds).toEqual([])
  })

  it('a program that succeeds on a later try keeps its rounds', async () => {
    let n = 0
    const eventually = async (id) => {
      if (id === 'p1' && n++ < 2) throw new Error('flaky')
      return id === 'p1' ? [project()] : []
    }
    const { index, buildings } = await run(rows, eventually, { retries: 3 })
    expect(index.failed).toBe(0)
    expect(buildings.med.universities[0].programs[0].rounds[0].round).toBe(3)
  })

  it('never has more than the requested number of upstream calls in flight', async () => {
    let inFlight = 0
    let peak = 0
    const many = Array.from({ length: 30 }, (_, i) => course({ program_id: `q${i}`, university_id: `u${i % 5}` }))
    await run(many, async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 1))
      inFlight -= 1
      return []
    }, { concurrency: 4 })
    expect(peak).toBeLessThanOrEqual(4)
    expect(peak).toBeGreaterThan(1)
  })

  it('is deterministic: same input, same output, regardless of the order upstream answers', async () => {
    const slowFirst = async (id) => {
      await new Promise((r) => setTimeout(r, id === 'p1' ? 8 : 1))
      return id === 'p1' ? [project()] : []
    }
    const a = await run(rows, slowFirst)
    const b = await run([...rows].reverse(), fetchRounds)
    expect(JSON.stringify(a.buildings.med)).toBe(JSON.stringify(b.buildings.med))
  })

  it('handles an empty dataset', async () => {
    const { index, buildings } = await run([], fetchRounds)
    expect(buildings).toEqual({})
    expect(index.buildings).toEqual({})
  })
})

describe('shouldReplaceIndex', () => {
  const idx = (programs) => ({ buildings: { med: { programs } } })
  it('replaces when there is no existing index or the new one is not smaller', () => {
    expect(shouldReplaceIndex(null, idx(10))).toBe(true)
    expect(shouldReplaceIndex(idx(10), idx(10))).toBe(true)
    expect(shouldReplaceIndex(idx(10), idx(12))).toBe(true)
  })
  it('refuses a smaller index (a mid-rebuild upstream) unless forced', () => {
    expect(shouldReplaceIndex(idx(10), idx(2))).toBe(false)
    expect(shouldReplaceIndex(idx(10), idx(2), { force: true })).toBe(true)
  })
  it('refuses an index with no programs at all', () => {
    expect(shouldReplaceIndex(null, { buildings: {} })).toBe(false)
  })
})

describe('rounds-service outage guard (review: a down or stale rounds service must not overwrite a good index)', () => {
  const idx = (programs, withRounds, failed = 0) => ({ failed, buildings: { med: { programs, withRounds } } })

  it('the built index counts the programs that have at least one project per building', async () => {
    const rows = [course({ program_id: 'p1' }), course({ program_id: 'p2' }), course({ program_id: 'p3' })]
    const { index } = await run(rows, async (id) => { if (id === 'p3') throw new Error('down'); return id === 'p2' ? [] : [project()] }, { retries: 1 })
    expect(index.buildings.med.programs).toBe(3)
    expect(index.buildings.med.withRounds).toBe(1) // p2 had no projects for the year, p3 failed
    expect(index.failed).toBe(1)
  })

  it('refuses an index in which no program has any round, even with nothing live yet', () => {
    expect(shouldReplaceIndex(null, idx(100, 0))).toBe(false)
    expect(indexVerdict(null, idx(100, 0)).reason).toMatch(/no program has any round/i)
    expect(shouldReplaceIndex(null, idx(100, 0), { force: true })).toBe(true)
  })

  it('refuses when programs with rounds collapse against the live index, although the program count did not', () => {
    expect(shouldReplaceIndex(idx(100, 90), idx(100, 20))).toBe(false)
    expect(indexVerdict(idx(100, 90), idx(100, 20)).reason).toMatch(/with rounds/i)
    expect(shouldReplaceIndex(idx(100, 90), idx(100, 85))).toBe(true) // a small drop is normal
    expect(shouldReplaceIndex(idx(100, 90), idx(100, 20), { force: true })).toBe(true)
  })

  it('refuses when more than a fifth of the round requests failed', () => {
    expect(shouldReplaceIndex(null, idx(100, 70, 30))).toBe(false)
    expect(indexVerdict(null, idx(100, 70, 30)).reason).toMatch(/failed/i)
    expect(shouldReplaceIndex(null, idx(100, 95, 5))).toBe(true)
  })

  it('an index from before this field existed keeps the old behaviour', () => {
    expect(shouldReplaceIndex({ buildings: { med: { programs: 10 } } }, { failed: 0, buildings: { med: { programs: 12, withRounds: 12 } } })).toBe(true)
  })
})
