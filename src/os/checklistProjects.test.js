import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  loadUniversityProjects, loadProjectManifest, resetProjectCaches, universityIdOfProgram, findProgram,
  projectKey, projectTitle, trackLabels, projectChecklist, goalProjects, projectProgress, majorName, thaiDate, ROUNDS,
} from './checklistProjects'

const project = {
  r: 1, k: '1:P2104:', id: 'P2104', n: 'โครงการรับนักเรียนที่มีความรู้ทางด้านคณิตศาสตร์', s: 2, t: ['formal', 'ged'],
  q: { min_gpax: 3.5, min_total_score: 48, min_gpa22: 3, min_age_date: '2008-05-01' }, sc: { tgat: 20, a_lv_61: 30 }, f: ['gc'], gs: [1, 1],
  c: 'มีผลงานระดับชาติ', il: 'ออนไลน์', iw: '9 พ.ย. 2569', it: '09.00', l: 'https://admission.chula.ac.th',
  fo: { pl: 10, cd: '2026-11-12', ce: '2026-11-14', cr: 'เกณฑ์ A', q: [{ t: 'ความสามารถทางวิชาการ\n(1) ชื่อการแข่งขัน\n(2) หลักฐาน', y: 'C' }, { t: 'แรงจูงใจ' }] },
}
const program = { p: '10010121301101A', n: 'วิศวกรรมนิวเคลียร์', f: 'คณะวิศวกรรมศาสตร์', fi: '21', cm: '', ty: '', mj: { A: 'ภาษาไทย' }, j: [project, { r: 2, k: '2:x:', id: null, s: 5, t: [] }, { r: 3, k: '3:x:A', id: null, m: 'A', s: 9, t: ['formal'] }, { r: 4, k: '4:x:', id: null, s: 1, t: [] }] }
const shard = { id: '001', name: 'จุฬาฯ', programs: [program] }

describe('ids and helpers', () => {
  it('reads the university id from a programme id', () => {
    expect(universityIdOfProgram('10010121301101A')).toBe('001')
    expect(universityIdOfProgram('bad')).toBeNull()
    expect(universityIdOfProgram(null)).toBeNull()
  })
  it('finds programmes and builds stable keys', () => {
    expect(findProgram(shard, '10010121301101A')).toBe(program)
    expect(findProgram(shard, 'x')).toBeNull()
    expect(projectKey('P', project)).toBe('P:1:P2104:')
    expect(projectKey('P', { r: 2, id: null }, 3)).toBe('P:2:i3:')
  })
  it('titles and track labels', () => {
    expect(projectTitle(project)).toContain('คณิตศาสตร์')
    expect(projectTitle({ r: 2, n: null })).toBe('รอบ 2 Quota')
    expect(projectTitle({ r: 3, n: null })).toBe('รอบ 3 Admission')
    expect(majorName(program, { m: 'A' })).toBe('ภาษาไทย')
    expect(majorName(program, { m: 'Z' })).toBe('สาขาย่อย Z')
    expect(majorName(program, {})).toBe('')
    expect(thaiDate('2026-11-12')).toBe('12 พ.ย. 2569')
    expect(thaiDate('x')).toBe('')
    expect(ROUNDS).toEqual([1, 2, 3, 4])
    expect(trackLabels(['formal', 'nope', 'ged'])).toEqual(['ม.ปลายสายสามัญ', 'GED'])
  })
})

describe('projectChecklist', () => {
  const doc = projectChecklist(program, project)
  const ids = doc.groups.flatMap((g) => g.items.map((i) => i.id))
  it('has unique ids and the expected groups', () => {
    expect(new Set(ids).size).toBe(ids.length)
    expect(doc.groups.map((g) => g.id)).toEqual(['e', 'r', 'f', 'd', 's', 'a'])
    expect(doc.id).toBe('10010121301101A:1:P2104:')
  })
  it('turns every labelled criterion into an eligibility item with a stable id', () => {
    const e = doc.groups[0].items
    expect(e.map((i) => i.id)).toEqual(['e-track', 'e-q-min_gpax', 'e-q-min_total_score', 'e-q-min_gpa22', 'e-q-min_age_date', 'e-sc-tgat', 'e-sc-a_lv_61', 'e-f-gc'])
    expect(e[0].n).toContain('ม.ปลายสายสามัญ')
    expect(e[1].t).toBe('คะแนน GPAX ต่ำสุด 3.5')
    expect(e[3].t).toContain('คณิตศาสตร์')
    expect(e[4].t).toContain('2008-05-01')
    expect(e[5].t).toContain('TGAT')
    expect(e[5].n).toBe('น้ำหนัก 20%')
    expect(e[7].t).toContain('สำเร็จการศึกษาปีปัจจุบัน')
  })
  it('keeps the announcement link and conditions, interview in steps', () => {
    const r = doc.groups[1].items
    expect(r[0].href).toBe('https://admission.chula.ac.th')
    expect(r[1].n).toBe('มีผลงานระดับชาติ')
    expect(doc.groups.find((g) => g.id === 's').items.at(-1).n).toBe('ออนไลน์ · 9 พ.ย. 2569 · 09.00')
    expect(doc.source.url).toBe('https://admission.chula.ac.th')
    expect(doc.meta.seats).toBe('รับ 2 คน (ชาย 1 · หญิง 1)')
  })
  it('lists the TCAS FOLIO settings of a round 1 project', () => {
    const f = doc.groups.find((g) => g.id === 'f').items
    expect(f.map((i) => i.id)).toEqual(['f-pl', 'f-cd', 'f-q1', 'f-q2', 'f-cr'])
    expect(f[0].t).toBe('แฟ้มสะสมผลงานไม่เกิน 10 หน้า')
    expect(f[1].t).toBe('ส่งแฟ้มภายใน 12 พ.ย. 2569')
    expect(f[1].n).toBe('แก้ไขได้ถึง 14 พ.ย. 2569')
    expect(f[2].t).toBe('ความสามารถทางวิชาการ')
    expect(f[2].n).toBe('(1) ชื่อการแข่งขัน\n(2) หลักฐาน')
    expect(f[4].n).toBe('เกณฑ์ A')
  })
  it('uses the quota template for round 2 and drops empty groups', () => {
    const q = projectChecklist(program, program.j[1])
    expect(q.groups.map((g) => g.id)).toEqual(['r', 'd', 's', 'a'])
    expect(q.groups.find((g) => g.id === 'd').items.some((i) => i.t.includes('สิทธิ์โควตา'))).toBe(true)
    expect(q.source.url).toBe('https://admission.chula.ac.th/admission_c1.php')   // no project link: the university's site
    expect(q.groups[0].items[0].t).toContain('เว็บรับสมัครของมหาวิทยาลัย')
  })
  it('has Admission and Direct Admission templates and shows the major', () => {
    const r3 = projectChecklist(program, program.j[2])
    expect(r3.groups.find((g) => g.id === 's').items.some((i) => i.t.includes('10 อันดับ'))).toBe(true)
    expect(r3.subtitle).toContain('ภาษาไทย')
    const r4 = projectChecklist(program, program.j[3])
    expect(r4.groups.find((g) => g.id === 's').items.some((i) => i.t.includes('ระบบของมหาวิทยาลัยโดยตรง'))).toBe(true)
  })
  it('keys id-less projects by the snapshot key, or by position as a fallback', () => {
    expect(projectChecklist(program, program.j[1]).id).toBe('10010121301101A:2:x:')
    const two = { ...program, j: [{ r: 2, id: null, s: 1, t: [] }, { r: 2, id: null, s: 2, t: [] }] }
    expect(projectChecklist(two, two.j[0]).id).toBe('10010121301101A:2:i0:')
    expect(projectChecklist(two, two.j[1]).id).toBe('10010121301101A:2:i1:')
  })
  it('ignores unsafe links, unknown criteria and unknown rounds', () => {
    const d = projectChecklist(program, { ...project, l: 'javascript:alert(1)', q: { not_a_label: 5 } })
    expect(d.groups[1].items[0].href).toBe('https://admission.chula.ac.th/admission_c1.php')   // unsafe link dropped, university site instead
    expect(d.groups[0].items.some((i) => i.id.includes('not_a_label'))).toBe(false)
    expect(projectChecklist(program, { ...project, r: 9 })).toBeNull()
  })
  it('counts progress', () => {
    expect(projectProgress(doc, [ids[0], ids[1], 'gone'])).toMatchObject({ done: 2 })
    expect(projectProgress({ groups: [] }, []).pct).toBe(0)
  })
})

describe('goalProjects', () => {
  it('lists a goal programme projects with keys', () => {
    const g = goalProjects(shard, { programId: '10010121301101A' })
    expect(g.projects.map((x) => x.key)).toEqual(['10010121301101A:1:P2104:', '10010121301101A:2:x:', '10010121301101A:3:x:A', '10010121301101A:4:x:'])
    expect(goalProjects(shard, { programId: 'zzz' })).toBeNull()
    expect(goalProjects(null, { programId: 'zzz' })).toBeNull()
  })
})

describe('loading', () => {
  beforeEach(() => resetProjectCaches())
  afterEach(() => vi.unstubAllGlobals())
  it('fetches a shard once and caches it', async () => {
    const f = vi.fn(async () => ({ ok: true, json: async () => shard }))
    vi.stubGlobal('fetch', f)
    expect(await loadUniversityProjects('001')).toEqual(shard)
    await loadUniversityProjects('001')
    expect(f).toHaveBeenCalledTimes(1)
    expect(f.mock.calls[0][0]).toBe('/data/checklist/projects/001.json')
  })
  it('rejects bad ids without fetching and retries after a failure', async () => {
    const f = vi.fn(async () => ({ ok: false }))
    vi.stubGlobal('fetch', f)
    expect(await loadUniversityProjects('../x')).toBeNull()
    expect(f).not.toHaveBeenCalled()
    expect(await loadUniversityProjects('002')).toBeNull()
    expect(await loadUniversityProjects('002')).toBeNull()
    expect(f).toHaveBeenCalledTimes(2)
  })
  it('survives a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await loadProjectManifest()).toBeNull()
  })
})
