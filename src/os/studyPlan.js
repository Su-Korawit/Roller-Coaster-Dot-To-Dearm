// Exam countdown + study planner (TCAS round 3). Pure functions, no React / storage.
import { todayKey, shiftKey, newId } from './lifeLogic'

const DAY_MS = 86400000
const parseKey = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }

// Whole days from `today` to `examDate` (0 = exam day, negative = passed, null = no/invalid date).
export function daysUntil(examDate, today = todayKey()) {
  if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return null
  return Math.round((parseKey(examDate) - parseKey(today)) / DAY_MS)
}

export function subjectTag(subject = '') {
  if (/tgat/i.test(subject)) return 'TGAT'
  if (/a[\s-]?level|เอเลเวล/i.test(subject)) return 'A-LEVEL'
  return 'อื่นๆ'
}

// Weight of a subject = points still missing (unknown own score counts as the full requirement).
export function subjectWeight({ needed = 0, mine = null }) {
  const gap = mine == null ? needed : needed - mine
  return Math.max(gap, 5)
}

export const MAX_PLAN_DAYS = 200
const SLOT_MIN = 15

// Deterministic day-by-day plan from `today` to the last exam day (inclusive), at most MAX_PLAN_DAYS days.
// Each subject is studied up to ITS exam day (`score.examDate`, else the plan's `examDate`): e.g. TGAT stops
// on its exam day while A-Level goes on to its own. Subjects whose day has passed are left out.
// Each day splits `hoursPerDay` into at most 3 subject blocks (multiples of 15 min). Subjects with the
// biggest score gap come up more often (smooth weighted round-robin).
// Returns [{ date, tasks: [{ subject, minutes, tag, text }] }].
export function buildStudyPlan({ today = todayKey(), examDate, scores = [], hoursPerDay = 2 }) {
  const subjects = scores.filter((s) => s.subject?.trim())
  // Days from today to each subject's exam day (null = no valid date → not planned).
  const last = subjects.map((s) => daysUntil(s.examDate || examDate, today))
  const usable = last.filter((n) => n != null && n >= 0)
  if (subjects.length === 0 || usable.length === 0) return []
  const dayCount = Math.min(Math.max(...usable) + 1, MAX_PLAN_DAYS)
  const total = Math.max(SLOT_MIN, Math.round((Math.max(0.25, hoursPerDay) * 60) / SLOT_MIN) * SLOT_MIN)
  const weights = subjects.map(subjectWeight)
  const credit = subjects.map(() => 0)
  const days = []
  for (let i = 0; i < dayCount; i++) {
    const active = subjects.map((_, j) => j).filter((j) => last[j] != null && last[j] >= i)
    if (active.length === 0) break
    const sum = active.reduce((acc, j) => acc + weights[j], 0)
    const pick = []
    const slots = Math.min(3, active.length)
    for (let k = 0; k < slots; k++) {
      for (const j of active) credit[j] += weights[j]
      let best = -1
      for (const j of active) {
        if (!pick.includes(j) && (best === -1 || credit[j] > credit[best])) best = j
      }
      credit[best] -= sum
      pick.push(best)
    }
    // Split the day's 15-minute units: one unit each first, the rest by weight (largest remainder).
    const units = total / SLOT_MIN
    const chosen = pick.slice(0, units)
    const cw = chosen.map((j) => weights[j])
    const csum = cw.reduce((acc, w) => acc + w, 0)
    const spare = units - chosen.length
    const quota = cw.map((w) => (w / csum) * spare)
    const got = quota.map((q) => Math.floor(q))
    let rest = spare - got.reduce((acc, n) => acc + n, 0)
    quota
      .map((q, idx) => ({ idx, frac: q - Math.floor(q) }))
      .sort((x, y) => y.frac - x.frac || x.idx - y.idx)
      .forEach(({ idx }) => { if (rest > 0) { got[idx] += 1; rest -= 1 } })
    const tasks = chosen.map((j, idx) => {
      const minutes = (1 + got[idx]) * SLOT_MIN
      const name = subjects[j].subject.trim()
      return { subject: name, minutes, tag: subjectTag(name), text: `${name} ${minutes} นาที` }
    })
    days.push({ date: shiftKey(today, i), tasks })
  }
  return days
}

// Flatten a plan into store tasks (marked `auto` so a re-plan can replace them).
export function planToTasks(days) {
  return days.flatMap((d) => d.tasks.map((t) => ({
    id: newId(), text: t.text, tag: t.tag, date: d.date, done: false, auto: true, minutes: t.minutes, subject: t.subject,
  })))
}

// Drop auto tasks dated today or later; keep past history and manual tasks; add the new ones.
export function replaceAutoTasks(tasks = [], newTasks = [], today = todayKey()) {
  return [...tasks.filter((t) => !(t.auto && t.date >= today)), ...newTasks]
}

// Plan progress up to and including `today`: planned vs finished minutes, percent 0..100.
export function planSuccess(tasks = [], today = todayKey()) {
  const due = tasks.filter((t) => t.auto && t.date <= today)
  const plannedMin = due.reduce((a, t) => a + (t.minutes || 0), 0)
  const doneMin = due.filter((t) => t.done).reduce((a, t) => a + (t.minutes || 0), 0)
  return { plannedMin, doneMin, percent: plannedMin ? Math.round((doneMin / plannedMin) * 100) : 0 }
}

// Reading minutes over the last 7 days (today included) from a { 'YYYY-MM-DD': minutes } log.
export function weekMinutes(log = {}, today = todayKey()) {
  let n = 0
  for (let i = 0; i < 7; i++) n += log[shiftKey(today, -i)] || 0
  return n
}

export function formatMinutes(min = 0) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h} ชม. ${m} น.` : `${m} น.`
}

// Chat room id shared by everyone who picked the same faculty + major (any university).
export function roomIdFor(faculty = '', major = '') {
  const clean = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[/\\#?[\]%.]+/g, '-').slice(0, 60)
  const f = clean(faculty)
  if (!f) return ''
  const m = clean(major)
  return m ? `${f}__${m}` : f
}

// ── Reading leaderboard helpers ─────────────────────────────────────────────────

// Monday of the week containing `today` (weeks run Mon–Sun).
export function weekStartKey(today = todayKey()) {
  const dow = parseKey(today).getDay()   // 0 = Sunday
  return shiftKey(today, -((dow + 6) % 7))
}

export function sumMinutes(log = {}) {
  return Object.values(log).reduce((a, n) => a + (Number.isFinite(n) ? n : 0), 0)
}

// Minutes read since Monday of this week.
export function thisWeekMinutes(log = {}, today = todayKey()) {
  const start = weekStartKey(today)
  return Object.entries(log).reduce((a, [day, n]) => (day >= start && day <= today ? a + (n || 0) : a), 0)
}

// Longest run of consecutive days with any reading, ending today or yesterday (the "current streak").
export function readingStreak(log = {}, today = todayKey()) {
  let cursor = (log[today] || 0) > 0 ? today : shiftKey(today, -1)
  let n = 0
  while ((log[cursor] || 0) > 0) { n += 1; cursor = shiftKey(cursor, -1) }
  return n
}

// Leaderboard rows for the current week: entries from older weeks count as 0. Highest first.
export function rankEntries(entries = [], today = todayKey()) {
  const wk = weekStartKey(today)
  return entries
    .map((e) => ({ ...e, minutes: e.weekKey === wk ? e.weekMinutes || 0 : 0 }))
    .sort((a, b) => b.minutes - a.minutes || (b.totalMinutes || 0) - (a.totalMinutes || 0))
    .map((e, i) => ({ ...e, rank: i + 1 }))
}
