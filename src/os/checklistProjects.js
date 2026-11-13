// Checklist <-> Goal: the projects of every TCAS round (1 Portfolio, 2 Quota, 3 Admission, 4 Direct) per programme.
// Data: public/data/checklist/projects/<universityId>.json (built by scripts/buildChecklistProjects.mjs),
// fetched per university on demand. Pure helpers below turn one project into a checklist document of the
// same shape as src/data/checklists/*.json, so the same UI renders both.
import templates from '../data/checklists/round-templates.json'
import criteria from '../data/checklists/criteria-labels.json'
import { SCORE_LABELS } from '../constants/scoreLabels'
import { safeUrl, uniLinks } from './checklistLogic'

export const PROJECTS_BASE = '/data/checklist/projects'
export const ANNOUNCEMENTS_BASE = '/data/checklist/announcements'
export const ROUNDS = [1, 2, 3, 4]
export const ROUND_NAMES = { 1: 'รอบ 1 Portfolio', 2: 'รอบ 2 Quota', 3: 'รอบ 3 Admission', 4: 'รอบ 4 Direct Admission' }

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

const annShards = new Map()
// Announcement-derived items of one university { u, at, docs: [{ url, src?, at, groups }], map } or null (most have none).
export function loadUniversityAnnouncements(universityId) {
  const id = String(universityId ?? '')
  if (!/^\d{3}$/.test(id)) return Promise.resolve(null)
  if (!annShards.has(id)) annShards.set(id, fetchJson(`${ANNOUNCEMENTS_BASE}/${id}.json`))
  return annShards.get(id)
}

// The announcement doc of one project in a shard from loadUniversityAnnouncements, or null.
export function announcementFor(annShard, programId, project) {
  const i = annShard?.map?.[`${programId}:${project.k}`]
  return Number.isInteger(i) ? annShard.docs[i] ?? null : null
}

export const resetProjectCaches = () => { shards.clear(); annShards.clear(); manifestPromise = null }

// MyTCAS program ids start with the 4-char year/university prefix: 1 + university id (e.g. 10010121300001A -> '001').
export const universityIdOfProgram = (programId) => (typeof programId === 'string' && /^\d{4}/.test(programId) ? programId.slice(1, 4) : null)

export const findProgram = (shard, programId) => shard?.programs?.find((p) => p.p === programId) ?? null

// Stable key for ticks: programme + the project's own key (round : id : major, built by the snapshot script).
export const projectKey = (programId, project, index = 0) => `${programId}:${project.k ?? `${project.r}:${project.id ?? `i${index}`}:${project.m ?? ''}`}`

export const projectTitle = (project) => project.n || ROUND_NAMES[project.r] || 'โครงการ'

// Major names of a programme { A: 'ภาษาไทย', ... } -> label of a project's major (or '').
export const majorName = (program, project) => (project.m ? program?.mj?.[project.m] ?? `สาขาย่อย ${project.m}` : '')

export function trackLabels(tracks = []) {
  return tracks.map((t) => templates.tracks[t]).filter(Boolean)
}

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
// 'YYYY-MM-DD' (Gregorian) -> '12 พ.ย. 2569' ('' when it is not a date).
export function thaiDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return ''
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''} ${Number(m[1]) + 543}`
}

const NL = String.fromCharCode(10)

// A multi-line prompt -> { t: first line, n: the rest }.
function splitPrompt(text) {
  const [first, ...rest] = String(text).split(NL).map((x) => x.trim()).filter(Boolean)
  return { t: first ?? '', ...(rest.length ? { n: rest.join(NL) } : {}) }
}

function seatsText(project) {
  if (!project.s) return undefined
  const [m, f] = project.gs ?? []
  return `รับ ${project.s} คน${m || f ? ` (ชาย ${m ?? 0} · หญิง ${f ?? 0})` : ''}`
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''))

// Build the checklist document of one project. `program` = { p, n, f }.
// `ann` = the project's announcement doc (announcementFor) when its items were read from the real announcement.
export function projectChecklist(program, project, index = Math.max(0, program.j?.indexOf(project) ?? 0), ann = null) {
  const round = templates.rounds[String(project.r)]
  if (!round) return null
  const groups = []
  const group = (id, t, items, n) => { if (items.length) groups.push({ id, t, ...(n ? { n } : {}), items: items.map(({ k, ...it }, i) => ({ id: `${id}-${k ?? String(i + 1).padStart(2, '0')}`, ...it })) }) }

  const elig = []
  const tracks = trackLabels(project.t)
  if (tracks.length) elig.push({ k: 'track', t: 'ตรวจว่าเป็นผู้สมัครประเภทที่โครงการรับ', n: `รับ: ${tracks.join(', ')}` })
  // every criterion MyTCAS labels (GPAX, GPA / credits per subject group, age, height, total score, ...)
  for (const [key, value] of Object.entries(project.q ?? {})) {
    const label = criteria[key]?.l
    if (!label) continue
    elig.push({ k: `q-${key}`, t: `${label} ${typeof value === 'number' ? fmt(value) : value}` })
  }
  const scoreKeys = Object.keys(project.sc ?? {})
  for (const k of scoreKeys) {
    const w = num(project.sc[k])
    elig.push({ k: `sc-${k}`, t: `มีผลสอบ ${SCORE_LABELS[k] ?? k}`, ...(w ? { n: `น้ำหนัก ${fmt(w)}%` } : {}) })
  }
  const FLAG_KEYS = { gc: 'grad_current', ts: 't_score', gp: 'gatpat_current' }
  for (const f of project.f ?? []) {
    const label = criteria[FLAG_KEYS[f]]?.l
    if (label) elig.push({ k: `f-${f}`, t: label })
  }
  group('e', 'คุณสมบัติและเกณฑ์', elig)

  // The project's own announcement; when MyTCAS has none, the university's admission site.
  const uni = uniLinks([universityIdOfProgram(program.p)])[0]
  const announce = safeUrl(project.l) ?? uni?.url ?? null
  const read = [{ k: 'ann', t: safeUrl(project.l) ? 'อ่านประกาศรับสมัครของโครงการทั้งฉบับ' : 'อ่านประกาศรับสมัคร (เว็บรับสมัครของมหาวิทยาลัย)', ...(announce ? { href: announce } : {}) }]
  if (project.c) read.push({ k: 'cond', t: 'เงื่อนไขของโครงการ (จากข้อมูล MyTCAS)', n: project.c })
  if (project.d) read.push({ k: 'desc', t: 'รายละเอียดเพิ่มเติม', n: project.d })
  group('r', 'ประกาศและเงื่อนไข', read, 'ข้อความเงื่อนไขมาจากมหาวิทยาลัยผ่าน MyTCAS ถ้าต่างจากประกาศฉบับเต็ม ให้ยึดประกาศ')

  const fo = project.fo
  if (fo) {
    const items = []
    if (fo.pl) items.push({ k: 'pl', t: `แฟ้มสะสมผลงานไม่เกิน ${fo.pl} หน้า` })
    if (fo.cd) items.push({ k: 'cd', t: `ส่งแฟ้มภายใน ${thaiDate(fo.cd)}`, ...(fo.ce ? { n: `แก้ไขได้ถึง ${thaiDate(fo.ce)}` } : {}) })
    ;(fo.q ?? []).forEach((q, i) => items.push({ k: `q${i + 1}`, ...splitPrompt(q.t) }))
    if (fo.cr) items.push({ k: 'cr', t: 'อ่านเกณฑ์การให้คะแนนแฟ้มและการสัมภาษณ์', n: fo.cr })
    group('f', 'แฟ้มสะสมผลงาน (TCAS FOLIO) ของโครงการนี้', items, 'หัวข้อที่โครงการกำหนดให้ใส่ในแฟ้ม (จากข้อมูล TCAS FOLIO ของ MyTCAS)')
  }

  // Items read from the real announcement (with the section they came from); a documents list from the announcement replaces the generic one.
  const annUrl = safeUrl(ann?.src ?? ann?.url)
  const annDocs = ann?.groups?.some((g) => g.id === 'xdocs')
  for (const g of ann?.groups ?? []) {
    const shown = g.items.map((it) => ({ k: it.id, t: it.t, ...(it.n || it.ref ? { n: [it.n, it.ref ? `จากหัวข้อ “${it.ref}” ของประกาศ` : ''].filter(Boolean).join(NL) } : {}) }))
    group(g.id, g.t, shown, 'อ่านจากประกาศจริงของโครงการ ถ้าต่างจากฉบับเต็ม ให้ยึดประกาศ')
  }
  if (!annDocs) group('d', 'เอกสารที่ต้องเตรียม', round.docs.map((d) => ({ ...d })), 'รายการทั่วไปของรอบนี้ แต่ละโครงการอาจขอไม่เหมือนกัน ตรวจกับประกาศ')

  const steps = round.steps.map((s) => ({ ...s }))
  const interview = [project.il, project.iw, project.it].filter(Boolean).join(' · ')
  if (interview) steps.push({ k: 'iv', t: 'การสอบสัมภาษณ์/สอบปฏิบัติ', n: interview })
  group('s', 'ขั้นตอนสมัคร', steps)
  group('a', 'หลังสมัคร', round.after.map((s) => ({ ...s })))

  return {
    id: projectKey(program.p, project, index),
    kind: 'project',
    title: projectTitle(project),
    subtitle: [program.f, program.n, majorName(program, project)].filter(Boolean).join(' · '),
    source: { label: safeUrl(project.l) ? 'ประกาศของโครงการ (ลิงก์จาก MyTCAS)' : 'เว็บรับสมัครของมหาวิทยาลัย', url: announce ?? 'https://www.mytcas.com/' },
    verifiedAt: templates.verifiedAt,
    ...(ann && annUrl ? { announcement: { url: annUrl, at: ann.at } } : {}),
    meta: { seats: seatsText(project) },
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
