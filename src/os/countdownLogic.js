// Pure logic for the Countdown app: days left to every exam subject, to each portfolio (round 1)
// deadline of the student's goals, and to the TCAS season milestones. No React, no storage.
import { daysUntil } from './studyPlan'
import { planInput } from './goalLogic'
import { subjectExam, TCAS_CALENDAR } from '../data/tcasCalendar'
import { projectKey, projectTitle } from './checklistProjects'

// "อีก 12 วัน" / "พรุ่งนี้" / "วันนี้" / "ผ่านมา 3 วัน" ('' when the date is unknown).
export function formatDays(days) {
  if (days == null) return ''
  if (days === 0) return 'วันนี้'
  if (days === 1) return 'พรุ่งนี้'
  return days > 0 ? `อีก ${days} วัน` : `ผ่านมา ${-days} วัน`
}

// Urgency tone for colouring: 'past' | 'soon' (<= 7 days) | 'near' (<= 30) | 'far'.
export function urgency(days) {
  if (days == null) return 'far'
  if (days < 0) return 'past'
  if (days <= 7) return 'soon'
  return days <= 30 ? 'near' : 'far'
}

const byDate = (a, b) => a.date.localeCompare(b.date) || String(a.title ?? a.subject).localeCompare(String(b.title ?? b.subject))

// One row per exam subject of the goal: { subject, date, days, session, exact, manual }.
// A hand-set exam date (target.examDateManual) replaces the calendar for every subject, as everywhere else.
export function subjectCountdowns({ target, scores = [], today }) {
  const input = planInput(target, scores)
  const manual = !!target?.examDateManual
  return input.scores
    .map((s) => {
      const date = manual ? input.examDate : s.examDate
      const info = manual ? null : subjectExam(s.subject)
      return date ? { subject: s.subject, date, days: daysUntil(date, today), session: info?.session ?? null, exact: !!info?.exact, manual } : null
    })
    .filter(Boolean)
    .sort(byDate)
}

// The nearest exam that has not passed yet (or null).
export const nextCountdown = (rows) => rows.find((r) => r.days != null && r.days >= 0) ?? null

// Portfolio (round 1) projects of a programme that publish a TCAS FOLIO submit-by date.
// `program` = a programme of a university snapshot { p, n, f, j: [project] }.
// -> [{ key, title, date, days, editUntil, editDays }] soonest first.
export function portfolioDeadlines(program, today) {
  if (!program?.j) return []
  return program.j
    .map((project, i) => ({ project, i }))
    .filter(({ project }) => project.r === 1 && /^\d{4}-\d{2}-\d{2}$/.test(project.fo?.cd ?? ''))
    .map(({ project, i }) => ({
      key: projectKey(program.p, project, i),
      title: projectTitle(project),
      date: project.fo.cd,
      days: daysUntil(project.fo.cd, today),
      editUntil: project.fo.ce ?? null,
      editDays: project.fo.ce ? daysUntil(project.fo.ce, today) : null,
    }))
    .sort(byDate)
}

// Season milestones from the TCAS calendar (exam windows, round results and application starts/ends).
// -> [{ id, label, date, days }] soonest first, passed ones last.
export function seasonMilestones(today, calendar = TCAS_CALENDAR) {
  const rows = []
  for (const e of calendar.exams) rows.push({ id: `exam-${e.id}`, label: e.label, date: e.start })
  for (const r of calendar.rounds) {
    if (r.start) rows.push({ id: `r${r.round}-start`, label: `รอบ ${r.round} ${r.label} เปิดรับสมัคร`, date: r.start })
    if (r.end) rows.push({ id: `r${r.round}-end`, label: `รอบ ${r.round} ${r.label} ปิดรับสมัคร`, date: r.end })
    if (r.result) rows.push({ id: `r${r.round}-result`, label: `รอบ ${r.round} ${r.label} ประกาศผล`, date: r.result })
  }
  const withDays = rows.map((r) => ({ ...r, days: daysUntil(r.date, today) })).filter((r) => r.days != null)
  const upcoming = withDays.filter((r) => r.days >= 0).sort((a, b) => a.date.localeCompare(b.date))
  const past = withDays.filter((r) => r.days < 0).sort((a, b) => b.date.localeCompare(a.date))
  return [...upcoming, ...past]
}

// The portfolio deadline that comes first (today or later) across all goals, or null.
// `byGoal` = { [goalId]: { rows: portfolioDeadlines(...) } }, `goals` keeps their order (first = primary goal).
export function nearestPortfolio(byGoal = {}, goals = []) {
  let best = null
  for (const g of goals) {
    for (const r of byGoal[g.id]?.rows ?? []) {
      if (r.days != null && r.days >= 0 && (!best || r.days < best.days)) best = { ...r, goal: g }
    }
  }
  return best
}
