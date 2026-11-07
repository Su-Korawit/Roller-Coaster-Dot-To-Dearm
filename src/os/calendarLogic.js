// Pure helpers for the Calendar app — no imports, no I/O.

const pad = (n) => String(n).padStart(2, '0')

// 'YYYY-MM-DD' for a local calendar day (not UTC, so a Thai evening never lands on the next day).
export const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

// Month grid: leading nulls up to the weekday of the 1st (Sunday-first), then one key per day.
export function monthCells(year, month) {
  const lead = new Date(year, month, 1).getDay()
  const count = new Date(year, month + 1, 0).getDate()
  const cells = Array(lead).fill(null)
  for (let d = 1; d <= count; d++) cells.push(dateKey(year, month, d))
  return cells
}

// { 'YYYY-MM-DD': [item, ...] } using item[field] as the date.
export function groupByDate(items, field = 'date') {
  const map = {}
  for (const it of items) if (it?.[field]) (map[it[field]] ||= []).push(it)
  return map
}

// Next `limit` events on or after `todayKey`, soonest first.
export function upcomingEvents(events, todayKey, limit = 5) {
  return [...events].filter((e) => e.date >= todayKey).sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit)
}
