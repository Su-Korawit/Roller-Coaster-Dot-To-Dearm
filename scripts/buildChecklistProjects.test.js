import { describe, it, expect } from 'vitest'
import { toProject, toFolio, assignKeys } from './buildChecklistProjects.mjs'

const row = {
  type: '1_2570', project_id: 'P1', project_name_th: 'โครงการ A', receive_student_number: 5,
  only_formal: 1, only_international: 2, only_vocational: 1, only_non_formal: 2, only_ged: 2,
  condition: 'มีผลงาน', description: '', interview_location: 'ออนไลน์', interview_date: '9 พ.ย.', interview_time: '09.00',
  link: 'https://a.example/x', min_gpax: 3, min_total_score: 40, min_gpa22: 2.5, min_credit_gpa22: 0,
  scores: { tgat: 50 }, grad_current: true, gender_male_number: 2, gender_female_number: 3,
}

describe('toProject', () => {
  it('maps a MyTCAS row to the compact shape', () => {
    expect(toProject(row)).toEqual({
      r: 1, id: 'P1', n: 'โครงการ A', s: 5, t: ['formal', 'vocational'], c: 'มีผลงาน',
      il: 'ออนไลน์', iw: '9 พ.ย.', it: '09.00', l: 'https://a.example/x',
      q: { min_gpax: 3, min_total_score: 40, min_gpa22: 2.5 }, sc: { tgat: 50 }, f: ['gc'], gs: [2, 3],
    })
  })
  it('keeps the major and drops placeholder values and non-http links', () => {
    const p = toProject({ ...row, major_id: 'B', project_id: null, project_name_th: null, condition: '-', link: 'javascript:x', interview_location: '', interview_date: '', interview_time: '', scores: {}, min_gpax: 0, min_total_score: 0, min_gpa22: 0, grad_current: false, gender_male_number: 0, gender_female_number: 0 })
    expect(p).toMatchObject({ m: 'B', id: null, n: null })
    for (const k of ['c', 'l', 'sc', 'q', 'f', 'gs', 'il', 'iw', 'it']) expect(p[k]).toBeUndefined()
  })
  it('uses a URL in the description as the link when there is none', () => {
    expect(toProject({ ...row, link: '', description: 'https://b.example/y' })).toMatchObject({ l: 'https://b.example/y' })
    expect(toProject({ ...row, description: 'https://b.example/y' }).d).toBeUndefined()
    expect(toProject({ ...row, description: 'ข้อความ' }).d).toBe('ข้อความ')
  })
  it('keeps date criteria and ignores unlabelled fields', () => {
    expect(toProject({ ...row, min_age_date: '2008-05-01', not_a_criterion: 9 }).q).toMatchObject({ min_age_date: '2008-05-01' })
    expect(toProject({ ...row, not_a_criterion: 9 }).q.not_a_criterion).toBeUndefined()
  })
  it('attaches the TCAS FOLIO settings', () => {
    expect(toProject({ ...row, folio: { page_limit: '10' } }).fo).toEqual({ pl: 10 })
    expect(toProject(row).fo).toBeUndefined()
  })
})

describe('toFolio', () => {
  it('reads page limit, dates, criteria and questions', () => {
    expect(toFolio({ page_limit: '12', closed_date: '2026-11-12T00:00:00.000Z', closed_edit_date: '2026-11-14T00:00:00.000Z', criteria: ' เกณฑ์ ', folio_q1: 'ข้อ 1', folio_q1_type: 'C', folio_q2: 'ข้อ 2' }))
      .toEqual({ pl: 12, cd: '2026-11-12', ce: '2026-11-14', cr: 'เกณฑ์', q: [{ t: 'ข้อ 1', y: 'C' }, { t: 'ข้อ 2', y: undefined }] })
  })
  it('returns null when empty or malformed', () => {
    expect(toFolio(null)).toBeNull()
    expect(toFolio({ page_limit: '' })).toBeNull()
    expect(toFolio({ closed_date: 'soon' })).toBeNull()
    expect(toFolio('x')).toBeNull()
  })
})

describe('assignKeys', () => {
  it('gives every project of a programme a unique, stable key', () => {
    const ps = assignKeys([{ r: 1, id: 'P1' }, { r: 1, id: 'P1', m: 'A' }, { r: 2, id: null }, { r: 2, id: null }, { r: 2, id: null }])
    expect(ps.map((p) => p.k)).toEqual(['1:P1:', '1:P1:A', '2:x:', '2:x::1', '2:x::2'])
    expect(new Set(ps.map((p) => p.k)).size).toBe(ps.length)
  })
})
