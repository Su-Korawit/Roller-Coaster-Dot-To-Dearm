// Builds the Checklist app's per-university project snapshot (TCAS rounds 1-4 projects).
//   node scripts/buildChecklistProjects.mjs            -> public/data/checklist/projects/<uni>.json + manifest.json
// Source: MyTCAS's own published data, the files the public site reads:
//   courses.json (programmes) and rounds/<programId>.json (projects of every round), both static on S3.
// Optional audit: AUDIT_DIR = folder of raw "program-projects" responses (the preview API) to diff against.
// Resumable via CACHE_DIR (raw responses, not committed). Output is sharded per university.
import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import labels from '../src/data/checklists/criteria-labels.json' with { type: 'json' }

const BASE = 'https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas'
const YEAR = 2570
const ROUNDS = new Set(['1', '2', '3', '4'])
const OUT = 'public/data/checklist/projects'
const CACHE = process.env.CACHE_DIR || path.join('.cache', 'checklist-rounds')
const AUDIT = process.env.AUDIT_DIR || ''
const CONCURRENCY = Number(process.env.CONCURRENCY || 12)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const clean = (v) => (typeof v === 'string' && v !== '0' && v !== '-' ? v.trim() : '')

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'Accept-Encoding': 'gzip' } })
      if (res.ok) return await res.json()
      if (res.status === 404 || res.status === 403) return []   // S3: a programme without a rounds file
    } catch { /* retry */ }
    await sleep(400 * (i + 1) ** 2)
  }
  throw new Error(`failed: ${url}`)
}

// Which kinds of applicants a project accepts (MyTCAS: 1 = accepted).
const TRACKS = [['only_formal', 'formal'], ['only_international', 'international'], ['only_vocational', 'vocational'], ['only_non_formal', 'nonformal'], ['only_ged', 'ged']]
const FLAGS = [['grad_current', 'gc'], ['t_score', 'ts'], ['gatpat_current', 'gp']]

// TCAS FOLIO settings of a round 1 project: page limit, deadlines, scoring criteria and the questions the
// portfolio must answer (folio_q1..q5).
export function toFolio(f) {
  if (!f || typeof f !== 'object') return null
  const o = {}
  const pl = Number(f.page_limit); if (Number.isFinite(pl) && pl > 0) o.pl = pl
  const day = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '')
  if (day(f.closed_date)) o.cd = day(f.closed_date)
  if (day(f.closed_edit_date)) o.ce = day(f.closed_edit_date)
  const cr = clean(f.criteria); if (cr) o.cr = cr.slice(0, 6000)
  const q = []
  for (let i = 1; i <= 9; i++) {
    const t = clean(f[`folio_q${i}`])
    if (t) q.push({ t: t.slice(0, 3000), y: clean(f[`folio_q${i}_type`]) || undefined })
  }
  if (q.length) o.q = q
  return Object.keys(o).length ? o : null
}

// One MyTCAS project row -> compact project. `majorId` is the row's major ('A', 'B'...) or null.
export function toProject(r) {
  const [round] = String(r.type).split('_')
  const o = {
    r: Number(round),
    id: clean(r.project_id) || null,
    n: clean(r.project_name_th) || null,
    s: r.receive_student_number ?? 0,
    t: TRACKS.filter(([k]) => r[k] === 1).map(([, v]) => v),
  }
  const major = clean(r.major_id); if (major) o.m = major
  const cond = clean(r.condition); if (cond) o.c = cond.slice(0, 2000)
  const desc = clean(r.description)
  if (/^https?:\/\/\S+$/i.test(desc)) { if (!clean(r.link)) o.l = desc } else if (desc) o.d = desc.slice(0, 2000)   // some universities put the announcement URL here
  const loc = clean(r.interview_location); if (loc) o.il = loc
  const date = clean(r.interview_date); if (date) o.iw = date
  const time = clean(r.interview_time); if (time) o.it = time
  const link = clean(r.link); if (/^https?:\/\//i.test(link)) o.l = link
  // every numeric criterion MyTCAS labels (GPA per subject group, credits, age, height, ... , total score)
  const q = {}
  for (const k of Object.keys(labels)) {
    const v = r[k]
    if (typeof v === 'number' && v > 0) q[k] = v
    else if (typeof v === 'string' && v && v !== '0' && v !== '-' && /date/.test(k)) q[k] = v
  }
  if (Object.keys(q).length) o.q = q
  if (r.scores && Object.keys(r.scores).length) o.sc = r.scores
  const fo = toFolio(r.folio); if (fo) o.fo = fo
  const flags = FLAGS.filter(([k]) => r[k] === true).map(([, v]) => v)
  if (flags.length) o.f = flags
  if (r.gender_male_number > 0 || r.gender_female_number > 0) o.gs = [r.gender_male_number ?? 0, r.gender_female_number ?? 0]
  return o
}

// Unique, stable key per project within a programme: round : project id : major (+ sequence when a row repeats).
export function assignKeys(projects) {
  const seen = new Map()
  for (const p of projects) {
    const base = `${p.r}:${p.id ?? 'x'}:${p.m ?? ''}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    p.k = n ? `${base}:${n}` : base
  }
  return projects
}

const sig = (p) => JSON.stringify([p.r, p.id, p.m ?? '', p.s, p.l ?? '', p.q ?? {}, p.sc ?? {}, p.c ?? '', p.t])   // folio is S3-only, so not compared

async function main() {
  await mkdir(CACHE, { recursive: true })
  await mkdir(OUT, { recursive: true })
  console.log('courses…')
  const courses = await getJson(`${BASE}/courses.json`)
  const byProgram = new Map()
  for (const c of courses) {
    if (!c.program_id) continue
    const e = byProgram.get(c.program_id) ?? { c, majors: {} }
    if (c.major_id && c.major_name_th) e.majors[c.major_id] = clean(c.major_name_th)
    else e.c = c   // the programme-level row (no major) names the programme
    byProgram.set(c.program_id, e)
  }
  const ids = [...byProgram.keys()]
  console.log(`${courses.length} course rows, ${ids.length} programmes`)

  let done = 0
  const results = new Map()
  const audit = { compared: 0, same: 0, diffs: [], onlyS3: 0, onlyPreview: 0 }
  const queue = [...ids]
  async function worker() {
    while (queue.length) {
      const id = queue.shift()
      const file = path.join(CACHE, `${id}.json`)
      let rows = null
      if (existsSync(file)) { try { rows = JSON.parse(await readFile(file, 'utf8')) } catch { rows = null } }
      if (!rows) {
        rows = await getJson(`${BASE}/rounds/${id}.json`)
        await writeFile(file, JSON.stringify(rows))
      }
      const projects = assignKeys(rows
        .filter((r) => String(r.type).endsWith(`_${YEAR}`) && ROUNDS.has(String(r.type).split('_')[0]))
        .map(toProject))
      if (projects.length) results.set(id, projects)
      if (AUDIT) {
        const pf = path.join(AUDIT, `${id}.json`)
        if (existsSync(pf)) {
          let prev = []
          try { prev = JSON.parse(await readFile(pf, 'utf8')) } catch { /* ignore */ }
          const pp = assignKeys(prev.filter((r) => String(r.type).endsWith(`_${YEAR}`) && ROUNDS.has(String(r.type).split('_')[0])).map(toProject))
          audit.compared++
          const a = new Set(projects.map(sig)); const b = new Set(pp.map(sig))
          const onlyA = [...a].filter((x) => !b.has(x)); const onlyB = [...b].filter((x) => !a.has(x))
          if (!onlyA.length && !onlyB.length) audit.same++
          else { audit.diffs.push({ id, onlyS3: onlyA.length, onlyPreview: onlyB.length }); audit.onlyS3 += onlyA.length; audit.onlyPreview += onlyB.length }
        }
      }
      if (++done % 500 === 0) console.log(`${done}/${ids.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  // shard per university
  const byUni = new Map()
  for (const [id, projects] of results) {
    const { c, majors } = byProgram.get(id)
    const u = byUni.get(c.university_id) ?? { id: c.university_id, name: clean(c.university_name_th), programs: [] }
    const prog = { p: id, n: clean(c.program_name_th), f: clean(c.faculty_name_th), fi: c.faculty_id, cm: clean(c.campus_name_th), ty: clean(c.program_type_name_th), j: projects }
    if (Object.keys(majors).length) prog.mj = majors
    u.programs.push(prog)
    byUni.set(c.university_id, u)
  }
  for (const f of await readdir(OUT)) if (f.endsWith('.json')) await unlink(path.join(OUT, f))
  // every university MyTCAS lists (universities.json), so the app can say which ones have no published TCAS70 programmes yet
  const listed = await getJson(`${BASE}/universities.json`)
  const allUnis = new Map(listed.filter((x) => x.university_id).map((x) => [x.university_id, clean(x.university_name)]))
  for (const c of courses) allUnis.set(c.university_id, clean(c.university_name_th))
  const manifest = { year: YEAR, builtAt: new Date().toISOString().slice(0, 10), source: 'MyTCAS rounds/<programId>.json', programmesTotal: ids.length, programmesWithProjects: results.size, universities: [], withoutProjects: [] }
  for (const [uid, name] of [...allUnis].sort((a, b) => a[0].localeCompare(b[0]))) {
    const u = byUni.get(uid)
    if (!u) { manifest.withoutProjects.push({ id: uid, name }); continue }
    u.programs.sort((a, b) => a.p.localeCompare(b.p))
    await writeFile(path.join(OUT, `${u.id}.json`), JSON.stringify(u))
    const proj = u.programs.flatMap((p) => p.j)
    const count = (r) => proj.filter((x) => x.r === r).length
    manifest.universities.push({ id: u.id, name: u.name, programs: u.programs.length, r1: count(1), r2: count(2), r3: count(3), r4: count(4) })
  }
  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest))
  console.log('universities', manifest.universities.length, 'programmes with projects', results.size, '/', ids.length)
  if (AUDIT) {
    console.log('AUDIT vs preview API:', JSON.stringify({ compared: audit.compared, identical: audit.same, differing: audit.diffs.length, onlyS3: audit.onlyS3, onlyPreview: audit.onlyPreview }))
    await writeFile(path.join(CACHE, '_audit.json'), JSON.stringify(audit.diffs))
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
