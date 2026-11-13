// Builds the Checklist app's per-university project snapshot (TCAS round 1 Portfolio + round 2 Quota).
//   node scripts/buildChecklistProjects.mjs            -> public/data/checklist/projects/<uni>.json + manifest.json
// Source: MyTCAS (course list on S3, then one "program-projects" call per programme — the same upstream
// api/mytcas.js uses). Polite: low concurrency, retries, resumable via CACHE_DIR (raw responses, not committed).
// Output is sharded per university so the app only downloads the university the student cares about.
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const COURSES_URL = 'https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json'
const PROJECTS_URL = 'https://tcas65.as.r.appspot.com/program-projects/program-id/'
const YEAR = 2570
const ROUNDS = new Set(['1', '2'])
const OUT = 'public/data/checklist/projects'
const CACHE = process.env.CACHE_DIR || path.join('.cache', 'checklist-projects')
const CONCURRENCY = Number(process.env.CONCURRENCY || 6)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const clean = (v) => (typeof v === 'string' && v !== '0' && v !== '-' ? v.trim() : '')

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'Accept-Encoding': 'gzip' } })
      if (res.ok) return await res.json()
      if (res.status === 404) return []
    } catch { /* retry */ }
    await sleep(500 * (i + 1) ** 2)
  }
  throw new Error(`failed: ${url}`)
}

// Which kinds of applicants a project accepts (MyTCAS: 1 = accepted).
const TRACKS = [['only_formal', 'formal'], ['only_international', 'international'], ['only_vocational', 'vocational'], ['only_non_formal', 'nonformal'], ['only_ged', 'ged']]

export function toProject(r) {
  const [round] = String(r.type).split('_')
  const o = {
    r: Number(round),
    id: clean(r.project_id) || null,
    n: clean(r.project_name_th) || null,
    s: r.receive_student_number ?? 0,
    t: TRACKS.filter(([k]) => r[k] === 1).map(([, v]) => v),
  }
  const cond = clean(r.condition); if (cond) o.c = cond.slice(0, 1500)
  const desc = clean(r.description)
  if (/^https?:\/\/\S+$/i.test(desc)) { if (!clean(r.link)) o.l = desc } else if (desc) o.d = desc.slice(0, 1500)   // some universities put the announcement URL here
  const loc = clean(r.interview_location); if (loc) o.il = loc
  const date = clean(r.interview_date); if (date) o.id2 = date
  const link = clean(r.link); if (/^https?:\/\//i.test(link)) o.l = link
  if (r.min_gpax != null) o.g = r.min_gpax
  if (r.min_total_score != null) o.ms = r.min_total_score
  if (r.scores && Object.keys(r.scores).length) o.sc = r.scores
  return o
}

async function main() {
  await mkdir(CACHE, { recursive: true })
  await mkdir(OUT, { recursive: true })
  console.log('courses…')
  const courses = await getJson(COURSES_URL)
  const programs = courses.filter((c) => c.program_id)
  console.log(`${programs.length} programmes`)

  let done = 0
  const results = new Map()
  const queue = [...programs]
  async function worker() {
    while (queue.length) {
      const c = queue.shift()
      const file = path.join(CACHE, `${c.program_id}.json`)
      let rows = null
      if (existsSync(file)) { try { rows = JSON.parse(await readFile(file, 'utf8')) } catch { rows = null } }   // a half-written cache file is refetched
      if (!rows) {
        rows = await getJson(PROJECTS_URL + c.program_id)
        await writeFile(file, JSON.stringify(rows))
        await sleep(120)
      }
      const projects = rows
        .filter((r) => String(r.type).endsWith(`_${YEAR}`) && ROUNDS.has(String(r.type).split('_')[0]))
        .map(toProject)
      if (projects.length) results.set(c.program_id, { c, projects })
      if (++done % 200 === 0) console.log(`${done}/${programs.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  // shard per university
  const byUni = new Map()
  for (const { c, projects } of results.values()) {
    const u = byUni.get(c.university_id) ?? { id: c.university_id, name: c.university_name_th, programs: [] }
    u.programs.push({
      p: c.program_id, n: clean(c.program_name_th), f: clean(c.faculty_name_th), fi: c.faculty_id,
      cm: clean(c.campus_name_th), ty: clean(c.program_type_name_th), j: projects,
    })
    byUni.set(c.university_id, u)
  }
  for (const f of await readdir(OUT)) if (f.endsWith('.json')) await (await import('node:fs/promises')).unlink(path.join(OUT, f))
  const manifest = { year: YEAR, builtAt: new Date().toISOString().slice(0, 10), universities: [] }
  for (const u of [...byUni.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    u.programs.sort((a, b) => a.p.localeCompare(b.p))
    await writeFile(path.join(OUT, `${u.id}.json`), JSON.stringify(u))
    const proj = u.programs.flatMap((p) => p.j)
    manifest.universities.push({ id: u.id, name: u.name, programs: u.programs.length, r1: proj.filter((x) => x.r === 1).length, r2: proj.filter((x) => x.r === 2).length })
  }
  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest))
  console.log('universities', manifest.universities.length, 'programmes with R1/R2', results.size)
}

import { fileURLToPath } from 'node:url'
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
