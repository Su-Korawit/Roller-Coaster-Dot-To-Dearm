/* global module */
// Pure verification math for Focus sessions (ADR 0018). No firebase-admin, so it
// unit-tests under the root vitest run. All times are epoch milliseconds read on
// the SERVER; the client never supplies a timestamp or a duration.
//
// Rule of thumb: time is credited only for the gap between two consecutive
// proofs of presence (start/check-in/end) and only if that gap is short enough
// to be believable. Credited time can never exceed wall-clock time, however
// often a client calls.

const CHECKIN_WINDOW_MS = 35 * 60 * 1000   // client prompts every ~25 min; 10 min of slack
const MIN_GAP_MS = 10 * 1000               // ignore call spam closer together than this
const DAILY_CAP_MS = 8 * 60 * 60 * 1000
const MS_PER_XP = 60 * 1000                // 1 XP per verified minute (before perks)
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000

// Calendar day in Asia/Bangkok (UTC+7, no DST), as 'YYYY-MM-DD'.
function bangkokDay(nowMs) {
  return new Date(nowMs + BANGKOK_OFFSET_MS).toISOString().slice(0, 10)
}

// Settle the segment ending at `nowMs`.
//   tooSoon  — called again within MIN_GAP_MS: nothing credited, nothing advanced
//   lapsed   — gap longer than the window: the gap is dropped, not credited
//   capped   — part/all of the credit was cut by the daily cap
function settleSegment({ lastCheckInAt, nowMs, dailyUsedMs = 0 }) {
  const gap = nowMs - lastCheckInAt
  if (!(gap >= MIN_GAP_MS)) {
    return { creditedMs: 0, tooSoon: true, lapsed: false, capped: false }
  }
  const lapsed = gap > CHECKIN_WINDOW_MS
  const raw = lapsed ? 0 : gap
  const remaining = Math.max(0, DAILY_CAP_MS - dailyUsedMs)
  const creditedMs = Math.min(raw, remaining)
  return { creditedMs, tooSoon: false, lapsed, capped: raw > remaining }
}

// Whole XP newly earned when a session total moves from beforeMs to afterMs.
// Using floor-of-totals means no XP is lost to per-call rounding.
function xpDelta(beforeMs, afterMs) {
  return Math.floor(afterMs / MS_PER_XP) - Math.floor(beforeMs / MS_PER_XP)
}

module.exports = {
  CHECKIN_WINDOW_MS,
  MIN_GAP_MS,
  DAILY_CAP_MS,
  MS_PER_XP,
  bangkokDay,
  settleSegment,
  xpDelta,
}
