import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  loadUniversityProjects, loadProjectManifest, resetProjectCaches, universityIdOfProgram, findProgram,
  projectKey, projectTitle, trackLabels, projectChecklist, goalProjects, projectProgress,
} from './checklistProjects'

const project = {
  r: 1, id: 'P2104', n: 'โครงการรับนักเรียนที่มีความรู้ทางด้านคณิตศาสตร์', s: 2, t: ['formal', 'ged'],
  g: 3.5, ms: 48, sc: { tgat: 20, a_lv_61: 30 }, c: 'มีผลงานระดับชาติ', il: 'ออนไลน์', id2: '9 พ.ย. 2569', l: 'https://admission.chula.ac.th',
}
const program = { p: '10010121301101A', n: 'วิศวกรรมนิวเคลียร์', f: 'คณะวิศวกรรมศาสตร์', fi: '21', cm: '', ty: '', j: [project, { r: 2, id: null, s: 5, t: [] }] }
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
    expect(projectKey('P', project)).toBe('P:1:P2104')
    expect(projectKey('P', { r: 2, id: null }, 3)).toBe('P:2:i3')
  })
  it('titles and track labels', () => {
    expect(projectTitle(project)).toContain('คณิตศาสตร์')
    expect(projectTitle({ r: 2, n: null })).toBe('รอบ 2 Quota')
    expect(trackLabels(['formal', 'nope', 'ged'])).toEqual(['ม.ปลายสายสามัญ', 'GED'])
  })
})

describe('projectChecklist', () => {
  const doc = projectChecklist(program, project)
  const ids = doc.groups.flatMap((g) => g.items.map((i) => i.id))
  it('has unique ids and the expected groups', () => {
    expect(new Set(ids).size).toBe(ids.length)
    expect(doc.groups.map((g) => g.id)).toEqual(['e', 'r', 'd', 's', 'a'])
    expect(doc.id).toBe('10010121301101A:1:P2104')
  })
  it('turns project data into eligibility items with stable ids', () => {
    const e = doc.groups[0].items
    expect(e.map((i) => i.id)).toEqual(['e-track', 'e-gpax', 'e-total', 'e-sc-tgat', 'e-sc-a_lv_61'])
    expect(e[0].n).toContain('ม.ปลายสายสามัญ')
    expect(e[1].t).toContain('3.5')
    expect(e[3].t).toContain('TGAT')
    expect(e[3].n).toBe('น้ำหนัก 20%')
  })
  it('keeps the announcement link and conditions, interview in steps', () => {
    const r = doc.groups[1].items
    expect(r[0].href).toBe('https://admission.chula.ac.th')
    expect(r[1].n).toBe('มีผลงานระดับชาติ')
    expect(doc.groups[3].items.at(-1).n).toBe('ออนไลน์ · 9 พ.ย. 2569')
    expect(doc.source.url).toBe('https://admission.chula.ac.th')
  })
  it('uses the quota template for round 2 and drops empty groups', () => {
    const q = projectChecklist(program, program.j[1])
    expect(q.groups.map((g) => g.id)).toEqual(['r', 'd', 's', 'a'])
    expect(q.groups.find((g) => g.id === 'd').items.some((i) => i.t.includes('สิทธิ์โควตา'))).toBe(true)
    expect(q.source.url).toBe('https://www.mytcas.com/')
  })
  it('gives id-less projects a key from their position', () => {
    const two = { ...program, j: [{ r: 2, id: null, s: 1, t: [] }, { r: 2, id: null, s: 2, t: [] }] }
    expect(projectChecklist(two, two.j[0]).id).toBe('10010121301101A:2:i0')
    expect(projectChecklist(two, two.j[1]).id).toBe('10010121301101A:2:i1')
  })
  it('ignores unsafe links and unknown rounds', () => {
    const d = projectChecklist(program, { ...project, l: 'javascript:alert(1)' })
    expect(d.groups[1].items[0].href).toBeUndefined()
    expect(projectChecklist(program, { ...project, r: 4 })).toBeNull()
  })
  it('counts progress', () => {
    expect(projectProgress(doc, [ids[0], ids[1], 'gone'])).toMatchObject({ done: 2 })
    expect(projectProgress({ groups: [] }, []).pct).toBe(0)
  })
})

describe('goalProjects', () => {
  it('lists a goal programme projects with keys', () => {
    const g = goalProjects(shard, { programId: '10010121301101A' })
    expect(g.projects.map((x) => x.key)).toEqual(['10010121301101A:1:P2104', '10010121301101A:2:i1'])
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
