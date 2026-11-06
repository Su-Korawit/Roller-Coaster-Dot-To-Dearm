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

export const MAX_PLAN_DAYS = 120
const SLOT_MIN = 15

// Deterministic day-by-day plan from `today` to exam day (inclusive), at most MAX_PLAN_DAYS days.
// Each day splits `hoursPerDay` into at most 3 subject blocks (multiples of 15 min). Subjects with
// the biggest score gap come up more often (smooth weighted round-robin).
// Returns [{ date, tasks: [{ subject, minutes, tag, text }] }].
export function buildStudyPlan({ today = todayKey(), examDate, scores = [], hoursPerDay = 2 }) {
  const left = daysUntil(examDate, today)
  const subjects = scores.filter((s) => s.subject?.trim())
  if (left == null || left < 0 || subjects.length === 0) return []
  const dayCount = Math.min(left + 1, MAX_PLAN_DAYS)
  const total = Math.max(SLOT_MIN, Math.round((Math.max(0.25, hoursPerDay) * 60) / SLOT_MIN) * SLOT_MIN)
  const weights = subjects.map(subjectWeight)
  const sum = weights.reduce((a, b) => a + b, 0)
  const credit = subjects.map(() => 0)
  const days = []
  for (let i = 0; i < dayCount; i++) {
    const pick = []
    const slots = Math.min(3, subjects.length)
    for (let k = 0; k < slots; k++) {
      for (let j = 0; j < subjects.length; j++) credit[j] += weights[j]
      let best = -1
      for (let j = 0; j < subjects.length; j++) {
        if (!pick.includes(j) && (best === -1 || credit[j] > credit[best])) best = j
      }
      credit[best] -= sum
      pick.push(best)
    }
    // Split the day's 15-minute units: one unit each first, the rest by weight (largest remainder).
    const units = total / SLOT_MIN
    const chosen = pick.slice(0, units)
    const cw = chosen.map((j) => weights[j])
    const csum = cw.reduce((a, b) => a + b, 0)
    const spare = units - chosen.length
    const quota = cw.map((w) => (w / csum) * spare)
    const got = quota.map((q) => Math.floor(q))
    let rest = spare - got.reduce((a, b) => a + b, 0)
    quota
      .map((q, idx) => ({ idx, frac: q - Math.floor(q) }))
      .sort((a, b) => b.frac - a.frac || a.idx - b.idx)
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
