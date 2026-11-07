// Pure helpers for the Habit "GitHub-style" grid — no React, no storage.
import { shiftKey } from './lifeLogic'

const MAX_WEEKS = 40
const dow = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getDay() }

// Weeks (columns of 7 day keys, Sunday first) from 4 weeks before today's week to the later of
// `lastDate` and 4 weeks ahead, at most MAX_WEEKS columns.
export function gridWeeks(today, lastDate = '') {
  const start = shiftKey(today, -dow(today) - 28)
  const wantEnd = lastDate && lastDate > shiftKey(today, 28) ? lastDate : shiftKey(today, 28)
  const weeks = []
  let cursor = start
  while (weeks.length < MAX_WEEKS && cursor <= wantEnd) {
    weeks.push(Array.from({ length: 7 }, (_, i) => shiftKey(cursor, i)))
    cursor = shiftKey(cursor, 7)
  }
  return weeks
}

// 0 nothing planned · 1 planned, none done · 2 under half done · 3 over half · 4 all done.
export function dayLevel(tasks = []) {
  if (tasks.length === 0) return 0
  const done = tasks.filter((t) => t.done).length
  if (done === 0) return 1
  if (done === tasks.length) return 4
  return done / tasks.length < 0.5 ? 2 : 3
}

// { 'YYYY-MM-DD': [task, ...] }
export function tasksByDay(tasks = []) {
  const map = {}
  for (const t of tasks) (map[t.date] ||= []).push(t)
  return map
}

// Index of the week column that holds `key`, or -1.
export const weekIndexOf = (weeks, key) => weeks.findIndex((w) => w.includes(key))
