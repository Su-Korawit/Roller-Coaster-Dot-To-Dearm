import { describe, it, expect, vi } from 'vitest'
import { runRefresh } from './refreshOpenHouseIndex.mjs'

const YEAR = 2570
const course = (n, over = {}) => ({
  program_id: `p${n}`, program_name_th: `หลักสูตร ${n}`, program_type_name_th: 'ปกติ', field_name_th: 'แพทยศาสตร์',
  faculty_name_th: 'คณะ', group_field_id: '10', cost: '1', major_id: '0', university_id: `u${n % 3}`,
  university_name_th: `มหาวิทยาลัย ${n % 3}`, university_type_name_th: 'ทปอ.', ...over,
})
// 50 programs: the "50-program fixture" of the spec
const ROWS = Array.from({ length: 50 }, (_, i) => course(i + 1, { group_field_id: i % 2 ? '10' : '30' }))
const project = (type = `3_${YEAR}`) => ({ type, project_name_th: 'โครงการ', receive_student_number: 5, min_gpax: 2.5, scores: { tpat1: 100 }, link: null, interview_location: '-' })

function setup({ existing = null, meta = { tcasYear: YEAR } } = {}) {
  const files = { 'data/mytcas/meta.json': meta, ...(existing ? { 'data/mytcas/openhouse/index.json': existing } : {}) }
  const writes = []
  const fetched = []
  const storage = {
    read: async (p) => files[p] ?? null,
    write: async (p, d) => { writes.push(p); files[p] = d },
  }
  const fetchJson = vi.fn(async (url) => {
    fetched.push(url)
    if (url.endsWith('courses.json')) return ROWS
    return [project()]
  })
  return { deps: { fetchJson, storage, now: () => Date.UTC(2026, 9, 16), log: () => {} }, writes, fetched, files }
}

describe('runRefresh', () => {
  it('a dry run builds everything but writes nothing', async () => {
    const { deps, writes } = setup()
    const r = await runRefresh({}, deps)
    expect(writes).toEqual([])
    expect(r.published).toBe(false)
    expect(Object.values(r.index.buildings).reduce((n, b) => n + b.programs, 0)).toBe(50)
  })

  it('--apply writes the building files first and index.json last, in the documented schema', async () => {
    const { deps, writes, files } = setup()
    const r = await runRefresh({ apply: true }, deps)
    expect(r.published).toBe(true)
    expect(writes.at(-1)).toBe('data/mytcas/openhouse/index.json')
    expect(writes.slice(0, -1).sort()).toEqual(['data/mytcas/openhouse/eng.json', 'data/mytcas/openhouse/med.json'])
    const index = files['data/mytcas/openhouse/index.json']
    expect(index).toMatchObject({ tcasYear: YEAR, updatedAt: '2026-10-16T00:00:00.000Z' })
    expect(Object.keys(index.buildings).sort()).toEqual(['eng', 'med'])
    const med = files['data/mytcas/openhouse/med.json']
    expect(med).toMatchObject({ tcasYear: YEAR, universities: expect.any(Array) })
    const program = med.universities[0].programs[0]
    expect(Object.keys(program).sort()).toEqual(['costText', 'nameTh', 'programId', 'rounds', 'typeTh'])
    expect(program.rounds[0]).toEqual({ round: 3, seats: 5, projects: [expect.objectContaining({ interview: false, minGpax: 2.5 })] })
  })

  it('asks the rounds service once per program', async () => {
    const { deps, fetched } = setup()
    await runRefresh({}, deps)
    expect(fetched.filter((u) => u.includes('program-id')).length).toBe(50)
  })

  it('keeps the live index when the new result is smaller, unless forced', async () => {
    const bigger = { buildings: { med: { programs: 500 } } }
    const kept = setup({ existing: bigger })
    expect((await runRefresh({ apply: true }, kept.deps)).published).toBe(false)
    expect(kept.writes).toEqual([])
    const forced = setup({ existing: bigger })
    expect((await runRefresh({ apply: true, force: true }, forced.deps)).published).toBe(true)
  })

  it('uses the year from the argument, else the stored meta, else 2570', async () => {
    const a = setup({ meta: { tcasYear: 2571 } })
    expect((await runRefresh({}, a.deps)).index.tcasYear).toBe(2571)
    const b = setup()
    expect((await runRefresh({ yearArg: '2572' }, b.deps)).index.tcasYear).toBe(2572)
    const c = setup({ meta: null })
    expect((await runRefresh({}, c.deps)).index.tcasYear).toBe(2570)
    await expect(runRefresh({ yearArg: 'abc' }, setup().deps)).rejects.toThrow('--year')
  })

  it('falls back to the Storage snapshot when the live courses look mid-rebuild', async () => {
    const s = setup()
    s.files['data/mytcas/courses-snapshot.json'] = ROWS
    s.deps.fetchJson = vi.fn(async (url) => (url.endsWith('courses.json') ? ROWS.slice(0, 3) : [project()]))
    const r = await runRefresh({}, s.deps)
    expect(Object.values(r.index.buildings).reduce((n, b) => n + b.programs, 0)).toBe(50)
  })
})
