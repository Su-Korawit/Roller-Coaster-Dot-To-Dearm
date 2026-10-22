// Pure logic of scripts/refreshOpenHouseIndex.mjs (ADR-0026): turn MyTCAS course rows plus the
// per-program rounds into the Open House index files. No I/O of its own — the upstream call, the
// clock and the sleep are injected so it runs under test.
import { dedupePrograms, classifyBuilding, summariseRounds, summariseBuilding } from '../src/utils/openHouseIndex.js'
import { SCORE_LABELS } from '../src/constants/scoreLabels.js'

const LOGO_BASE = 'https://assets.mytcas.com/i/logo'
const BACKOFF_MS = 250

// Raw project rows of one program -> rounds of the current TCAS year ({ round, seats, projects }).
export function formatProgramRounds(rawRows, year) {
  const byRound = new Map()
  for (const r of Array.isArray(rawRows) ? rawRows : []) {
    if (!r || typeof r.type !== 'string') continue
    const [roundText, yearText] = r.type.split('_')
    const round = Number(roundText)
    if (!(round >= 1 && round <= 4) || Number(yearText) !== year) continue
    const scores = Object.entries(r.scores ?? {})
      .filter(([, weight]) => Number.isFinite(weight))
      .map(([key, weight]) => ({ key, label: SCORE_LABELS[key] ?? key, weight }))
    const place = typeof r.interview_location === 'string' ? r.interview_location.trim() : ''
    const entry = byRound.get(round) ?? { round, seats: 0, projects: [] }
    const seats = Number.isFinite(r.receive_student_number) ? r.receive_student_number : 0
    entry.seats += seats
    entry.projects.push({
      nameTh: r.project_name_th && r.project_name_th !== '0' ? r.project_name_th : null,
      seats,
      minGpax: Number.isFinite(r.min_gpax) ? r.min_gpax : null,
      scores,
      interview: (r.scores?.interview ?? 0) > 0 || (place !== '' && place !== '-' && place !== '0'),
      link: typeof r.link === 'string' && r.link ? r.link : null,
    })
    byRound.set(round, entry)
  }
  return [...byRound.values()].sort((a, b) => a.round - b.round)
}

async function withRetries(fn, retries, sleep) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return { ok: true, value: await fn() }
    } catch (e) {
      if (attempt >= retries) return { ok: false, error: e }
      await sleep(BACKOFF_MS * 2 ** (attempt - 1))
    }
  }
}

async function pool(items, size, worker) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.max(1, Math.min(size, items.length)) }, async () => {
    while (next < items.length) {
      const i = next
      next += 1
      out[i] = await worker(items[i])
    }
  }))
  return out
}

const byId = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

// rows: raw courses.json rows. fetchRounds(programId) -> raw project rows (may throw).
export async function buildIndex({ rows, fetchRounds, year, now = Date.now, concurrency = 4, retries = 3, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const programs = dedupePrograms(rows)
  let skipped = 0
  const placed = []
  for (const p of programs) {
    const building = classifyBuilding(p)
    if (!building || !p.university_id) {
      skipped += 1
      continue
    }
    placed.push({ p, building })
  }

  let failed = 0
  const rounds = await pool(placed, concurrency, async ({ p }) => {
    const res = await withRetries(() => fetchRounds(p.program_id), retries, sleep)
    if (!res.ok) {
      failed += 1
      return []
    }
    return formatProgramRounds(res.value, year)
  })

  const updatedAt = new Date(now()).toISOString()
  const grouped = new Map() // building -> university id -> university
  placed.forEach(({ p, building }, i) => {
    const unis = grouped.get(building) ?? new Map()
    const uni = unis.get(p.university_id) ?? {
      id: p.university_id,
      nameTh: p.university_name_th ?? '',
      typeTh: p.university_type_name_th ?? '',
      logoUrl: `${LOGO_BASE}/${p.university_id}.png`,
      programs: [],
    }
    uni.programs.push({ programId: p.program_id, nameTh: p.program_name_th ?? '', typeTh: p.program_type_name_th ?? '', costText: p.cost ?? '', rounds: rounds[i] })
    unis.set(p.university_id, uni)
    grouped.set(building, unis)
  })

  const buildings = {}
  const summary = {}
  for (const id of [...grouped.keys()].sort()) {
    const universities = [...grouped.get(id).values()].sort((a, b) => byId(a.id, b.id))
    for (const u of universities) u.programs.sort((a, b) => byId(a.programId, b.programId))
    buildings[id] = { tcasYear: year, updatedAt, universities }
    const withRounds = universities.reduce((n, u) => n + u.programs.filter((pr) => pr.rounds.some((r) => (r.projects ?? []).length > 0)).length, 0)
    summary[id] = { ...summariseBuilding(universities), withRounds, rounds: summariseRounds(universities) }
  }
  return { index: { tcasYear: year, updatedAt, failed, skipped, buildings: summary }, buildings }
}

const sumOf = (index, key) => Object.values(index?.buildings ?? {}).reduce((n, b) => n + (b[key] ?? 0), 0)
const totalPrograms = (index) => sumOf(index, 'programs')
const hasWithRounds = (index) => Object.values(index?.buildings ?? {}).some((b) => b.withRounds !== undefined)

const MAX_FAILED_SHARE = 0.2 // more failed round requests than this and the run is not trusted
const MAX_ROUNDS_DROP = 0.1 // programs with rounds may shrink by this much against the live index

// Whether `next` may replace `existing`, and why not. Refused: an empty index; a smaller one than the
// live one (MyTCAS mid-rebuild); one where the rounds service failed for a fifth of the programs; one
// where no (or far fewer) programs have a round although the program list is intact, which is what
// a down or rate-limited rounds service, or a stale TCAS year, looks like. `force` overrides all but
// the empty index.
export function indexVerdict(existing, next, { force = false } = {}) {
  const incoming = totalPrograms(next)
  if (incoming === 0) return { ok: false, reason: 'the new result is empty' }
  if (force) return { ok: true, reason: 'forced' }
  if (existing && incoming < totalPrograms(existing)) return { ok: false, reason: 'the new result has fewer programs than the one live' }
  if (hasWithRounds(next)) {
    const withRounds = sumOf(next, 'withRounds')
    if (withRounds === 0) return { ok: false, reason: 'no program has any round (rounds service down, rate-limited or wrong TCAS year?)' }
    if ((next.failed ?? 0) > MAX_FAILED_SHARE * incoming) return { ok: false, reason: `round requests failed for ${next.failed} of ${incoming} programs` }
    if (existing && hasWithRounds(existing) && withRounds < sumOf(existing, 'withRounds') * (1 - MAX_ROUNDS_DROP)) {
      return { ok: false, reason: `programs with rounds fell from ${sumOf(existing, 'withRounds')} to ${withRounds}` }
    }
  }
  return { ok: true, reason: 'ok' }
}

export const shouldReplaceIndex = (existing, next, opts) => indexVerdict(existing, next, opts).ok
