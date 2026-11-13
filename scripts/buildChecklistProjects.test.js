import { describe, it, expect } from 'vitest'
import { toProject } from './buildChecklistProjects.mjs'

const row = {
  type: '1_2570', project_id: 'P1', project_name_th: 'โครงการ A', receive_student_number: 5,
  only_formal: 1, only_international: 2, only_vocational: 1, only_non_formal: 2, only_ged: 2,
  condition: 'มีผลงาน', description: '', interview_location: 'ออนไลน์', interview_date: '9 พ.ย.',
  link: 'https://a.example/x', min_gpax: 3, min_total_score: 40, scores: { tgat: 50 },
}

describe('toProject', () => {
  it('maps a MyTCAS row to the compact shape', () => {
    expect(toProject(row)).toEqual({
      r: 1, id: 'P1', n: 'โครงการ A', s: 5, t: ['formal', 'vocational'], c: 'มีผลงาน',
      il: 'ออนไลน์', id2: '9 พ.ย.', l: 'https://a.example/x', g: 3, ms: 40, sc: { tgat: 50 },
    })
  })
  it('drops placeholder values and non-http links', () => {
    const p = toProject({ ...row, project_id: '0', project_name_th: '0', condition: '-', link: 'javascript:x', interview_location: '', interview_date: '', scores: {} })
    expect(p.id).toBeNull()
    expect(p.n).toBeNull()
    expect(p.c).toBeUndefined()
    expect(p.l).toBeUndefined()
    expect(p.sc).toBeUndefined()
  })
  it('uses a URL in the description as the link when there is none', () => {
    expect(toProject({ ...row, link: '', description: 'https://b.example/y' })).toMatchObject({ l: 'https://b.example/y' })
    expect(toProject({ ...row, description: 'https://b.example/y' }).d).toBeUndefined()
    expect(toProject({ ...row, description: 'ข้อความ' }).d).toBe('ข้อความ')
  })
})
