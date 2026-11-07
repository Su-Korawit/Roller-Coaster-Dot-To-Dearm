import { newId } from './lifeLogic'
import { UNIVERSITY_ROWS } from '../data/universityApps'
import { examDateForSubject, firstExamDate } from '../data/tcasCalendar'
import { daysUntil } from './studyPlan'

// Goal app logic (pure): turning a MyTCAS / TCAS Starter programme into a goal, and keeping the
// student's score list in step with the primary goal.

export const MAX_GOALS = 5
export const DEFAULT_NEEDED = 60   // used when the source does not publish a minimum score

// Only exam scores become study subjects. GPAX, portfolio, interview etc. are not studied per subject.
const isExamKey = (key = '') => /^(tgat|tpat|a_lv_)/i.test(key)

// "TGAT1 การสื่อสารภาษาอังกฤษ" → "TGAT1"; "A-Level คณิตศาสตร์ 1" stays whole.
export function shortSubject(label = '') {
  const t = String(label).trim()
  return /^(TGAT|TPAT)/i.test(t) ? t.split(/\s+/)[0].toUpperCase() : t
}

// MyTCAS round-3 project → score requirements [{ subject, weight, needed, estimated }].
export function scoresFromProject(project) {
  const min = Number(project?.min_total_score)
  const known = Number.isFinite(min) && min > 0
  return (project?.scores ?? [])
    .filter((s) => isExamKey(s.key) && Number(s.weight) > 0)
    .map((s) => ({
      subject: shortSubject(s.label ?? s.key),
      weight: Number(s.weight),
      needed: known ? Math.round(min) : DEFAULT_NEEDED,
      estimated: !known,
    }))
}

// TCAS Starter department → same shape (it publishes subjects + weights, not minimum totals).
export function scoresFromSubjects(subjects) {
  return (subjects ?? [])
    .filter((s) => Number(s.weight) > 0 && /^(TGAT|TPAT|A-?LEVEL|A_LV)/i.test(s.label))
    .map((s) => ({ subject: shortSubject(s.label), weight: Number(s.weight), needed: DEFAULT_NEEDED, estimated: true }))
}

export const goalKey = (g) => g.programId ? `${g.source}:${g.programId}` : `${g.university}|${g.faculty}|${g.program}`.toLowerCase()

export function makeGoal(input) {
  return {
    id: newId(),
    source: input.source ?? 'manual',          // 'mytcas' | 'tcasin' | 'manual'
    universityId: input.universityId ?? null,  // MyTCAS id ('001'); links to the university's Store app
    university: input.university ?? '',
    faculty: input.faculty ?? '',
    program: input.program ?? '',
    programId: input.programId ?? null,
    reqs: input.reqs ?? [],
    url: input.url ?? null,
  }
}

export const goalTitle = (g) => g.program || g.faculty || g.university || 'เป้าหมาย'
export const goalSubtitle = (g) => [g.university, g.faculty && g.faculty !== g.program ? g.faculty : ''].filter(Boolean).join(' · ')

// Target text (used by Habit, Community rooms, Secretary) + score list for a goal. Scores the student
// typed themselves stay; scores that came from the previous goal are replaced, keeping "mine" by subject.
export function applyGoalToState({ target, scores }, goal) {
  const mineBySubject = new Map(scores.filter((s) => s.mine != null).map((s) => [s.subject, s.mine]))
  const manual = scores.filter((s) => !s.fromGoal)
  const have = new Set(manual.map((s) => s.subject))
  const fromGoal = goal.reqs
    .filter((r) => !have.has(r.subject))
    .map((r) => ({ id: newId(), subject: r.subject, needed: r.needed, mine: mineBySubject.get(r.subject) ?? null, fromGoal: true, estimated: !!r.estimated, weight: r.weight, examDate: examDateForSubject(r.subject) }))
  return {
    // The exam day comes from the official TCAS calendar (first exam among the goal's subjects) unless the student set it by hand.
    target: {
      ...target,
      university: goal.university,
      faculty: goal.faculty,
      major: goal.program,
      examDate: target.examDateManual && target.examDate ? target.examDate : firstExamDate(goal.reqs),
    },
    scores: [...manual, ...fromGoal],
  }
}

// University Store app id for a goal: KU keeps its original "KU Admission" tile.
export function universityAppId(universityId) {
  if (!universityId) return null
  return universityId === '002' ? 'link-kuadmission' : `uni-${universityId}`
}

// Which advisor suggestion matches which MyTCAS university / faculty (names as the AI wrote them).
const norm = (s) => String(s ?? '').replace(/\s+/g, '').replace(/^(มหาวิทยาลัย|ม\.)/, '').toLowerCase()
export function matchUniversity(universities, name) {
  const n = norm(name)
  if (!n) return null
  return universities.find((u) => norm(u.university_name_th) === n)
    ?? universities.find((u) => norm(u.university_name_th).includes(n) || n.includes(norm(u.university_name_th)))
    ?? null
}
export function matchByName(items, name, field) {
  const n = norm(name)
  if (!n) return null
  return items.find((i) => norm(i[field]) === n) ?? items.find((i) => norm(i[field]).includes(n) || n.includes(norm(i[field]))) ?? null
}

// MyTCAS university id for a university name from another source (TCAS Starter), or null.
export function universityIdByName(name, rows = UNIVERSITY_ROWS) {
  const hit = matchByName(rows.map(([id, full]) => ({ id, name: full })), name, 'name')
  return hit?.id ?? null
}

// The exam dates every consumer (planner, countdowns, Secretary, Habit) uses. They come from the TCAS
// calendar by subject, so goals saved before the calendar existed (no dates stored) still work.
// A hand-set date (`target.examDateManual`) overrides the calendar for every subject.
export function planInput(target, scores = []) {
  if (target?.examDateManual) {
    return { examDate: target.examDate || '', scores: scores.map((x) => ({ ...x, examDate: null })) }
  }
  return {
    examDate: firstExamDate(scores),
    scores: scores.map((x) => ({ ...x, examDate: x.examDate || examDateForSubject(x.subject) })),
  }
}

// First exam day for the countdown ('' when a manual date was cleared).
export const effectiveExamDate = (target, scores) => planInput(target, scores).examDate

// Drag-and-drop order: move `fromId` to where `toId` is. Unknown ids or from === to keep the list as is.
export function moveGoal(goals, fromId, toId) {
  const from = goals.findIndex((g) => g.id === fromId)
  const to = goals.findIndex((g) => g.id === toId)
  if (from < 0 || to < 0 || from === to) return goals
  const next = goals.filter((g) => g.id !== fromId)
  next.splice(to, 0, goals[from])
  return next
}

// Readiness of one subject before the real score exists (scores come out after the exam):
//   done  0..1  share of that subject's planned minutes already ticked off
//   time  0..1  how far we are from the first planned day to the exam day (the tick on the bar)
//   status 'none' (no plan) | 'passed' | 'ahead' (done >= time) | 'behind'
export function subjectReadiness({ subject, tasks = [], examDate, today }) {
  const mine = tasks.filter((t) => t.auto && t.subject === subject)
  const planned = mine.reduce((a, t) => a + (t.minutes || 0), 0)
  const doneMin = mine.filter((t) => t.done).reduce((a, t) => a + (t.minutes || 0), 0)
  const left = daysUntil(examDate, today)
  const done = planned ? doneMin / planned : 0
  let time = 0
  if (left != null && mine.length) {
    const start = mine.map((t) => t.date).sort()[0]
    const span = daysUntil(examDate, start)
    time = span > 0 ? Math.min(1, Math.max(0, (span - left) / span)) : 1
  }
  const status = left != null && left < 0 ? 'passed' : !planned ? 'none' : done >= time ? 'ahead' : 'behind'
  return { done, time, planned, doneMin, daysLeft: left, status }
}
