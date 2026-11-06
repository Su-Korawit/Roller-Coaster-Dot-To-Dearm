// Pure helpers for the Goal / Habit / Reading apps (no React, no storage).

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function shiftKey(key, days) {
  const [y, m, d] = key.split('-').map(Number)
  return todayKey(new Date(y, m - 1, d + days))
}

// Consecutive days ending today (or yesterday, if today isn't done yet).
export function habitStreak(doneDates = [], today = todayKey()) {
  const set = new Set(doneDates)
  let cursor = set.has(today) ? today : shiftKey(today, -1)
  let n = 0
  while (set.has(cursor)) {
    n += 1
    cursor = shiftKey(cursor, -1)
  }
  return n
}

export function toggleDone(doneDates = [], day = todayKey()) {
  return doneDates.includes(day) ? doneDates.filter((x) => x !== day) : [...doneDates, day]
}

// Share of items done (0..100). Used for the day plan's progress bar.
export function goalProgress(items = []) {
  if (!items.length) return 0
  return Math.round((items.filter((s) => s.done).length / items.length) * 100)
}

// How far my score is from the needed one: >0 still missing, <=0 reached, null when unknown.
export function scoreGap(needed, mine) {
  if (mine == null || Number.isNaN(mine)) return null
  return Math.round((needed - mine) * 100) / 100
}

// Reading progress 0..100, clamped.
export function readingProgress(page = 0, total = 0) {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((page / total) * 100)))
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
