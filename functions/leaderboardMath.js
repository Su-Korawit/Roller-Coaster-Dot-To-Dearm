/* global module */
// Pure math for the weekly school leaderboard (ADR 0018). No firebase-admin.
//
// Ranking metric = verified hours per REGISTERED member, i.e. a school wins by
// getting its whole student body studying, not by having a few grinders or by
// being large. A school is only ranked once >= MIN_CONTRIBUTORS distinct students
// logged verified time that week. Fake accounts claiming a school only dilute it
// (they raise memberCount without adding hours).

const MIN_CONTRIBUTORS = 10
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const MS_PER_HOUR = 60 * 60 * 1000

const pad = (n) => String(n).padStart(2, '0')
const dayString = (utcMidnightMs) => new Date(utcMidnightMs).toISOString().slice(0, 10)

// ISO-8601 week (Mon-Sun) for the Asia/Bangkok calendar day containing nowMs.
// Returns { week:'2026-W42', days:[Mon..Sun 'YYYY-MM-DD'], endsAtMs } where
// endsAtMs is the instant the next week starts (Monday 00:00 Bangkok).
function weekInfo(nowMs) {
  const bkk = new Date(nowMs + BANGKOK_OFFSET_MS)
  const dayMs = Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate())
  const dow = (new Date(dayMs).getUTCDay() + 6) % 7          // Mon=0 .. Sun=6
  const monday = dayMs - dow * DAY_MS
  const thursday = monday + 3 * DAY_MS
  const weekYear = new Date(thursday).getUTCFullYear()
  const jan1 = Date.UTC(weekYear, 0, 1)
  const week = 1 + Math.floor((thursday - jan1) / (7 * DAY_MS))
  return {
    week: `${weekYear}-W${pad(week)}`,
    days: Array.from({ length: 7 }, (_, i) => dayString(monday + i * DAY_MS)),
    endsAtMs: monday + 7 * DAY_MS - BANGKOK_OFFSET_MS,
  }
}

// rows: [{ uid, schoolId, verifiedMs }]  (one per user-day from focusDaily)
// schools: { [schoolId]: { name, memberCount } }
// Returns one entry per school that had any verified time.
function aggregateSchools(rows, schools = {}) {
  const bySchool = new Map()
  for (const r of rows) {
    if (!r.schoolId || !(r.verifiedMs > 0)) continue
    const s = bySchool.get(r.schoolId) ?? { totalMs: 0, uids: new Set() }
    s.totalMs += r.verifiedMs
    s.uids.add(r.uid)
    bySchool.set(r.schoolId, s)
  }
  const out = []
  for (const [schoolId, s] of bySchool) {
    const info = schools[schoolId] ?? {}
    const contributors = s.uids.size
    const members = Math.max(Number(info.memberCount) || 0, contributors)
    out.push({
      schoolId,
      schoolName: typeof info.name === 'string' ? info.name.slice(0, 80) : null,
      contributors,
      memberCount: members,
      totalMs: s.totalMs,
      avgHoursPerMember: Math.round((s.totalMs / MS_PER_HOUR / members) * 100) / 100,
      ranked: contributors >= MIN_CONTRIBUTORS,
    })
  }
  return out
}

module.exports = { MIN_CONTRIBUTORS, weekInfo, aggregateSchools }
