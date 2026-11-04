// Pure derivation for the TCAS Plan (ADR-0025): checklists, subjects, goals, ranks, the
// "what next" card. No stores, no I/O, never throws on malformed data.
import { daysUntil } from '../data/tcas70'

export const RANK_MAX = 10
export const PLAN_VERSION = 2

const SUBJECT_KEY = /^(tgat[1-3]?|tpat(1|11|13|2|21|3|4|5)|a_lv_(6[1-6]|70|8[1-9]))$/

// An exam subject the student can study for (not GPAX, portfolio, interview…). Mirrored in
// functions/subjectKeys.js; both run the same fixture list.
export const isSubjectKey = (key) => typeof key === 'string' && SUBJECT_KEY.test(key)

const isRound = (r) => r === 1 || r === 2 || r === 3 || r === 4
const validScores = (scores) => (Array.isArray(scores)
  ? scores.filter((s) => s && typeof s.key === 'string' && Number.isFinite(s.weight)).map((s) => ({ key: s.key, label: typeof s.label === 'string' ? s.label : s.key, weight: s.weight }))
  : [])

const item = (id, text) => ({ id, text, done: false, source: 'auto' })

// What the student needs for one program in one round, from the chosen project's data.
export function autoChecklist({ round, minGpax, scores } = {}) {
  const sc = validScores(scores)
  const items = []
  if (Number.isFinite(minGpax) && minGpax > 0) items.push(item('auto:gpax', `GPAX ≥ ${minGpax}`))
  for (const s of sc) if (isSubjectKey(s.key)) items.push(item(`auto:${s.key}`, `สอบ ${s.label}`))
  if (round === 1 || sc.some((s) => s.key === 'portfolio')) items.push(item('auto:portfolio', 'เตรียม Portfolio'))
  if (sc.some((s) => s.key === 'interview')) items.push(item('auto:interview', 'สัมภาษณ์'))
  return items
}

// Regenerated auto items keep what the student ticked; their own items are kept as they are;
// auto items that no longer apply disappear.
export function mergeChecklist(existing, generated) {
  const old = Array.isArray(existing) ? existing : []
  const merged = (generated ?? []).map((g) => {
    const was = old.find((o) => o.id === g.id)
    return was ? { ...g, done: was.done === true } : g
  })
  return [...merged, ...old.filter((o) => o.source === 'user')]
}

// The subjects across the whole plan: how many programs use each, its highest weight. A program
// counts once even when it sits in the plan under two rounds.
export function aggregateSubjects(entries) {
  const by = new Map()
  const seen = new Set()
  for (const e of Array.isArray(entries) ? entries : []) {
    for (const s of validScores(e?.scores)) {
      if (!isSubjectKey(s.key)) continue
      const row = by.get(s.key) ?? { key: s.key, label: s.label, programs: 0, maxWeight: 0 }
      const tag = `${e.programId ?? e.id}|${s.key}`
      if (!seen.has(tag)) {
        seen.add(tag)
        row.programs += 1
      }
      row.maxWeight = Math.max(row.maxWeight, s.weight)
      by.set(s.key, row)
    }
  }
  return [...by.values()].sort((a, b) => b.programs - a.programs || b.maxWeight - a.maxWeight || a.label.localeCompare(b.label, 'th'))
}

// 20 h base + up to 60 h by weight, in steps of 5.
export function defaultGoalHours(maxWeight) {
  const w = Math.min(100, Math.max(0, Number(maxWeight) || 0))
  return 20 + Math.round((60 * w) / 100 / 5) * 5
}

// open / closed / unannounced. "Closed" only when the calendar says that round's results are out;
// without calendar data a round with projects is simply open (no invented closing date).
export function roundStatus({ round, hasProjects, events, today }) {
  if (!hasProjects) return 'unannounced'
  const closed = (Array.isArray(events) ? events : []).some((e) => e.round === round && e.kind === 'announce' && e.date <= today)
  return closed ? 'closed' : 'open'
}

const rankOf = (e) => (e?.round === 3 && Number.isInteger(e.rank) && e.rank >= 1 && e.rank <= RANK_MAX ? e.rank : null)

export function nextFreeRank(entries) {
  const used = new Set((Array.isArray(entries) ? entries : []).map(rankOf).filter(Boolean))
  for (let r = 1; r <= RANK_MAX; r += 1) if (!used.has(r)) return r
  return null
}

// Round 3 holds ranks 1..n without gaps or duplicates, in rank order (ties by position); ranks
// outside round 3 are cleared; anything beyond the 10th round-3 entry loses its round.
export function normalizeRanks(entries) {
  const list = Array.isArray(entries) ? entries : []
  const round3 = list
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e?.round === 3)
    .sort((a, b) => (rankOf(a.e) ?? Infinity) - (rankOf(b.e) ?? Infinity) || a.i - b.i)
  const assigned = new Map()
  round3.forEach(({ e }, n) => assigned.set(e, n < RANK_MAX ? { round: 3, rank: n + 1 } : { round: null, rank: null }))
  return list.map((e) => (assigned.has(e) ? { ...e, ...assigned.get(e) } : { ...e, rank: null }))
}

// Old entries ({ id, university, program }) and malformed ones become valid v2 entries.
export function migrateEntry(old) {
  if (!old || typeof old !== 'object') return null
  const round = isRound(old.round) ? old.round : null
  const checklist = (Array.isArray(old.checklist) ? old.checklist : [])
    .filter((c) => c && typeof c.id === 'string' && typeof c.text === 'string')
    .map((c) => ({ id: c.id, text: c.text, done: c.done === true, source: c.source === 'auto' ? 'auto' : 'user' }))
  return {
    id: old.id,
    v: PLAN_VERSION,
    addedAt: old.addedAt ?? Date.now(),
    university: old.university ?? null,
    program: old.program ?? null,
    universityId: old.universityId ?? null,
    universityName: old.universityName ?? null,
    programId: old.programId ?? null,
    programName: old.programName ?? null,
    buildingId: old.buildingId ?? null,
    round,
    rank: rankOf({ ...old, round }),
    projectName: old.projectName ?? null,
    scores: validScores(old.scores),
    minGpax: Number.isFinite(old.minGpax) ? old.minGpax : null,
    checklist,
  }
}

// The nearest dated milestone (today or later) that touches the plan: an event for a round the
// student has entries in, or an exam covering a subject they need. Null when nothing is known.
export function nextUp({ entries, events, today }) {
  const list = Array.isArray(entries) ? entries : []
  const dated = (Array.isArray(events) ? events : []).filter((e) => e?.date && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  for (const event of dated) {
    const touched = list.filter((e) => (e.round != null && event.round === e.round)
      || (Array.isArray(event.examKeys) && validScores(e.scores).some((s) => event.examKeys.includes(s.key))))
    if (touched.length === 0) continue
    const all = touched.flatMap((e) => e.checklist ?? [])
    return { event, days: daysUntil(event.date, today), entries: touched, progress: { done: all.filter((c) => c.done).length, total: all.length } }
  }
  return null
}
