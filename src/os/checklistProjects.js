// Checklist <-> Goal: round 1 (Portfolio) and round 2 (Quota) projects per programme.
// Data: public/data/checklist/projects/<universityId>.json (built by scripts/buildChecklistProjects.mjs),
// fetched per university on demand. Pure helpers below turn one project into a checklist document of the
// same shape as src/data/checklists/*.json, so the same UI renders both.
import templates from '../data/checklists/round-templates.json'
import { SCORE_LABELS } from '../constants/scoreLabels'
import { safeUrl } from './checklistLogic'

export const PROJECTS_BASE = '/data/checklist/projects'
export const ROUND_NAMES = { 1: 'รอบ 1 Portfolio', 2: 'รอบ 2 Quota' }

const shards = new Map()
let manifestPromise = null

async function fetchJson(url) {
  try {
    const res = await fetch(url)
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

// One university's snapshot { id, name, programs: [{ p, n, f, fi, cm, ty, j: [project] }] } or null.
export function loadUniversityProjects(universityId) {
  const id = String(universityId ?? '')
  if (!/^\d{3}$/.test(id)) return Promise.resolve(null)
  if (!shards.has(id)) {
    shards.set(id, fetchJson(`${PROJECTS_BASE}/${id}.json`).then((d) => { if (!d) shards.delete(id); return d }))
  }
  return shards.get(id)
}

// { year, builtAt, universities: [{ id, name, programs, r1, r2 }] } or null.
export function loadProjectManifest() {
  if (!manifestPromise) manifestPromise = fetchJson(`${PROJECTS_BASE}/manifest.json`).then((d) => { if (!d) manifestPromise = null; return d })
  return manifestPromise
}

export const resetProjectCaches = () => { shards.clear(); manifestPromise = null }

// MyTCAS program ids start with the 4-char year/university prefix: 1 + university id (e.g. 10010121300001A -> '001').
export const universityIdOfProgram = (programId) => (typeof programId === 'string' && /^\d{4}/.test(programId) ? programId.slice(1, 4) : null)

export const findProgram = (shard, programId) => shard?.programs?.find((p) => p.p === programId) ?? null

// Stable key for ticks: programme + round + project id (or its position when a project has no id).
export const projectKey = (programId, project, index = 0) => `${programId}:${project.r}:${project.id ?? `i${index}`}`

export const projectTitle = (project) => project.n || ROUND_NAMES[project.r] || 'โครงการ'

export function trackLabels(tracks = []) {
  return tracks.map((t) => templates.tracks[t]).filter(Boolean)
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''))

// Build the checklist document of one project. `program` = { p, n, f }.
export function projectChecklist(program, project, index = Math.max(0, program.j?.indexOf(project) ?? 0)) {
  const round = templates.rounds[String(project.r)]
  if (!round) return null
  const groups = []
  const group = (id, t, items, n) => { if (items.length) groups.push({ id, t, ...(n ? { n } : {}), items: items.map(({ k, ...it }, i) => ({ id: `${id}-${k ?? String(i + 1).padStart(2, '0')}`, ...it })) }) }

  const elig = []
  const tracks = trackLabels(project.t)
  if (tracks.length) elig.push({ k: 'track', t: 'ตรวจว่าเป็นผู้สมัครประเภทที่โครงการรับ', n: `รับ: ${tracks.join(', ')}` })
  const gpax = num(project.g)
  if (gpax != null && gpax > 0) elig.push({ k: 'gpax', t: `GPAX ไม่ต่ำกว่า ${fmt(gpax)}` })
  const total = num(project.ms)
  if (total != null && total > 0) elig.push({ k: 'total', t: `คะแนนรวมขั้นต่ำ ${fmt(total)}` })
  const scoreKeys = Object.keys(project.sc ?? {})
  for (const k of scoreKeys) {
    const w = num(project.sc[k])
    elig.push({ k: `sc-${k}`, t: `มีผลสอบ ${SCORE_LABELS[k] ?? k}`, ...(w ? { n: `น้ำหนัก ${fmt(w)}%` } : {}) })
  }
  group('e', 'คุณสมบัติและเกณฑ์', elig)

  const read = [{ k: 'ann', t: 'อ่านประกาศรับสมัครของโครงการทั้งฉบับ', ...(safeUrl(project.l) ? { href: project.l } : {}) }]
  if (project.c) read.push({ k: 'cond', t: 'เงื่อนไขของโครงการ (จากข้อมูล MyTCAS)', n: project.c })
  if (project.d) read.push({ k: 'desc', t: 'รายละเอียดเพิ่มเติม', n: project.d })
  group('r', 'ประกาศและเงื่อนไข', read, 'ข้อความเงื่อนไขมาจากมหาวิทยาลัยผ่าน MyTCAS ถ้าต่างจากประกาศฉบับเต็ม ให้ยึดประกาศ')

  group('d', 'เอกสารที่ต้องเตรียม', round.docs.map((d) => ({ ...d })), 'รายการทั่วไปของรอบนี้ แต่ละโครงการอาจขอไม่เหมือนกัน ตรวจกับประกาศ')

  const steps = round.steps.map((s) => ({ ...s }))
  const interview = [project.il, project.id2].filter(Boolean).join(' · ')
  if (interview) steps.push({ k: 'iv', t: 'การสอบสัมภาษณ์/สอบปฏิบัติ', n: interview })
  group('s', 'ขั้นตอนสมัคร', steps)
  group('a', 'หลังสมัคร', round.after.map((s) => ({ ...s })))

  return {
    id: projectKey(program.p, project, index),
    kind: 'project',
    title: projectTitle(project),
    subtitle: [program.f, program.n].filter(Boolean).join(' · '),
    source: { label: 'ประกาศของโครงการ (ลิงก์จาก MyTCAS)', url: safeUrl(project.l) ?? 'https://www.mytcas.com/' },
    verifiedAt: templates.verifiedAt,
    meta: { seats: project.s ? `รับ ${project.s} คน` : undefined },
    groups,
  }
}

// Goal -> its round 1 / 2 projects (needs the university shard). [{ program, projects: [{ project, key }] }].
export function goalProjects(shard, goal) {
  const program = findProgram(shard, goal?.programId)
  if (!program) return null
  return {
    program,
    projects: program.j.map((project, i) => ({ project, key: projectKey(program.p, project, i) })),
  }
}

// How many items of a generated checklist are ticked (ids come from the doc itself).
export function projectProgress(doc, checked = []) {
  const ids = doc.groups.flatMap((g) => g.items.map((i) => i.id))
  const set = new Set(checked)
  const done = ids.filter((id) => set.has(id)).length
  return { done, total: ids.length, pct: ids.length ? Math.round((done / ids.length) * 100) : 0 }
}
