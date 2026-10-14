/* global module */
// MBTI temperament perks for Focus XP (ADR 0018). Pure: no firebase-admin.
//
// Four temperaments, one small passive each: +10% XP in a circumstance that
// rewards the habit that temperament is known for. Perks only ever scale XP —
// never the verified hours behind the school leaderboard — so they cannot be
// used to inflate a school's ranking.
//
// KEEP IN STEP with src/constants/temperaments.js (a test asserts the MBTI map
// and thresholds match).

const TEMPERAMENT_BY_MBTI = {
  INTJ: 'NT', INTP: 'NT', ENTJ: 'NT', ENTP: 'NT',
  INFJ: 'NF', INFP: 'NF', ENFJ: 'NF', ENFP: 'NF',
  ISTJ: 'SJ', ISFJ: 'SJ', ESTJ: 'SJ', ESFJ: 'SJ',
  ISTP: 'SP', ISFP: 'SP', ESTP: 'SP', ESFP: 'SP',
}

const PERK_BONUS = 0.1
const DEEP_FOCUS_MS = 50 * 60 * 1000     // NT: time already verified in this session
const NIGHT_FROM_HOUR = 20               // NF: 20:00-01:59 Asia/Bangkok
const NIGHT_UNTIL_HOUR = 2
const SPRINT_DAILY_MS = 30 * 60 * 1000   // SP: the first 30 min of each day
const YESTERDAY_MIN_MS = 20 * 60 * 1000  // SJ: studied at least 20 min yesterday
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000

function temperamentOf(mbti) {
  return typeof mbti === 'string' ? TEMPERAMENT_BY_MBTI[mbti.toUpperCase()] ?? null : null
}

function bangkokHour(nowMs) {
  return new Date(nowMs + BANGKOK_OFFSET_MS).getUTCHours()
}

// XP multiplier for the segment being settled. `sessionVerifiedMs` and
// `dailyBeforeMs` are the totals BEFORE this segment is credited.
function xpMultiplier({ temperament, sessionVerifiedMs = 0, dailyBeforeMs = 0, nowMs, studiedYesterday = false }) {
  let active = false
  switch (temperament) {
    case 'NT': active = sessionVerifiedMs >= DEEP_FOCUS_MS; break
    case 'NF': { const h = bangkokHour(nowMs); active = h >= NIGHT_FROM_HOUR || h < NIGHT_UNTIL_HOUR; break }
    case 'SJ': active = studiedYesterday === true; break
    case 'SP': active = dailyBeforeMs < SPRINT_DAILY_MS; break
    default: active = false
  }
  return active ? 1 + PERK_BONUS : 1
}

module.exports = {
  TEMPERAMENT_BY_MBTI, PERK_BONUS, DEEP_FOCUS_MS, NIGHT_FROM_HOUR, NIGHT_UNTIL_HOUR,
  SPRINT_DAILY_MS, YESTERDAY_MIN_MS, temperamentOf, bangkokHour, xpMultiplier,
}
