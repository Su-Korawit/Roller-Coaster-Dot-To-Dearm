// Pure helpers for the Mood app — no React, no storage. Dates are local 'YYYY-MM-DD' keys.

export const MOODS = [
  { level: 1, label: 'แย่มาก' },
  { level: 2, label: 'ไม่ค่อยดี' },
  { level: 3, label: 'เฉยๆ' },
  { level: 4, label: 'ดี' },
  { level: 5, label: 'ดีมาก' },
]
export const moodLabel = (level) => MOODS.find((m) => m.level === level)?.label ?? ''

const pad = (n) => String(n).padStart(2, '0')
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return key(d) }

// GitHub-style columns of 7 day keys (Sunday first) covering the last `weeks` weeks, ending with this week.
// Days after today are null (the last column is only partly filled).
export function moodWeeks(today, weeks = 26) {
  const thisSunday = addDays(today, -fromKey(today).getDay())
  const start = addDays(thisSunday, -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => { const k = addDays(start, w * 7 + d); return k > today ? null : k }))
}

// { 'YYYY-MM-DD': level } — if a day has several entries the last one wins.
export function moodByDate(notes = []) {
  const map = {}
  for (const n of notes) if (n?.date && n.feel >= 1 && n.feel <= 5) map[n.date] = n.feel
  return map
}

// How often each mood appeared in the last `days` days (today included), plus the average.
export function moodFrequency(notes, today, days = 30) {
  const map = moodByDate(notes)
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let total = 0
  let sum = 0
  for (let i = 0; i < days; i++) {
    const level = map[addDays(today, -i)]
    if (level) { counts[level] += 1; total += 1; sum += level }
  }
  return { counts, total, average: total ? Math.round((sum / total) * 10) / 10 : null }
}

// Record (or change) today's mood in a feelingNotes list: one entry per day.
export function withMood(notes = [], date, level) {
  return [...notes.filter((n) => n.date !== date), { date, feel: level }]
}
