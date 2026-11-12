// api/_voice/logic.js
import { CALL_MODES, CALL_GOALS, OPENINGS, secretaryName, validSecretaryId } from './persona.js'
// Pure rules for the "พี่ใจดี" voice secretary: consent, trial, quota, ceilings,
// scheduling. No I/O here — store.js wraps these in Firestore transactions so a
// quota check and its write can never race (Codex review, DECISIONS.md).
//
// State shape (doc voiceSecretary/{uid}, server-written only):
// {
//   consent: { granted, version, at, revokedAt, birthYear, guardian: {name, relationship, phone, at} } | null,
//   phone: '+66XXXXXXXXX' | null,
//   schedule: { days: [0-6], time: 'HH:MM' } | null,        // Asia/Bangkok
//   doNotCall: boolean,                                       // "หยุดรับสาย"
//   trialStartedAt: ms | null,
//   paid: boolean,                                            // set by a future payment webhook only
//   usage: { webSecondsUsed, dayKey, daySeconds, dayCalls, lastWebCallAt },
//   reservations: { [callKey]: { seconds, at, settled } },
//   phoneCalls: { dayKey, count, lastCallAt },
//   lastPhoneStatus: string | null
// }

export const CONSENT_VERSION = 'voice-pdpa-2026-11-v1'
export const ADULT_AGE = 13            // minimum age without a guardian (matches the sign-up policy); year-only birth data -> conservative (see isAdult)
export const TRIAL_DAYS = 3
export const BKK_OFFSET_MS = 7 * 3600 * 1000
export const CALL_WINDOW = { startHour: 6, endHour: 22 }   // never dial outside 06:00-22:00 Bangkok (last schedule time 21:59)

export const DEFAULT_LIMITS = {
  trialWebSeconds: 600,       // 10 min total in trial
  paidWebSecondsPerDay: 900,  // 15 min / day once paid
  trialWebSecondsPerDay: 300, // 5 min / day in trial
  webCallSeconds: 180,        // reservation per Web Call (agent max duration must be <= this)
  webMinGapSeconds: 10,       // rate limit: min gap between web-call tokens
  phoneCallsPerDay: 1,
  phoneCallSeconds: 300,
  globalDailyCalls: 20,       // system-wide ceiling per day (web + phone)
  globalDailySeconds: 3600,
}

export function limitsFromEnv(env = {}) {
  const n = (k, d) => {
    const v = Number(env[k])
    return Number.isFinite(v) && v > 0 ? v : d
  }
  return {
    trialWebSeconds: n('VOICE_TRIAL_WEB_SECONDS', DEFAULT_LIMITS.trialWebSeconds),
    paidWebSecondsPerDay: n('VOICE_PAID_WEB_SECONDS_PER_DAY', DEFAULT_LIMITS.paidWebSecondsPerDay),
    trialWebSecondsPerDay: n('VOICE_TRIAL_WEB_SECONDS_PER_DAY', DEFAULT_LIMITS.trialWebSecondsPerDay),
    webCallSeconds: n('VOICE_WEB_CALL_SECONDS', DEFAULT_LIMITS.webCallSeconds),
    webMinGapSeconds: n('VOICE_WEB_MIN_GAP_SECONDS', DEFAULT_LIMITS.webMinGapSeconds),
    phoneCallsPerDay: n('VOICE_PHONE_CALLS_PER_DAY', DEFAULT_LIMITS.phoneCallsPerDay),
    phoneCallSeconds: n('VOICE_PHONE_CALL_SECONDS', DEFAULT_LIMITS.phoneCallSeconds),
    globalDailyCalls: n('VOICE_GLOBAL_DAILY_CALLS', DEFAULT_LIMITS.globalDailyCalls),
    globalDailySeconds: n('VOICE_GLOBAL_DAILY_SECONDS', DEFAULT_LIMITS.globalDailySeconds),
  }
}

export function emptyState() {
  return {
    consent: null,
    phone: null,
    schedule: null,
    doNotCall: false,
    trialStartedAt: null,
    paid: false,
    usage: { webSecondsUsed: 0, dayKey: null, daySeconds: 0, dayCalls: 0, lastWebCallAt: 0 },
    reservations: {},
    phoneCalls: { dayKey: null, count: 0, lastCallAt: 0 },
    lastPhoneStatus: null,
  }
}

export function emptyGlobal() {
  return { dayKey: null, calls: 0, seconds: 0 }
}

// ── time helpers (Asia/Bangkok, no DST) ─────────────────────────────────────
export function bkk(now) {
  const d = new Date(now + BKK_OFFSET_MS)
  return {
    dayKey: d.toISOString().slice(0, 10),
    weekday: d.getUTCDay(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    year: d.getUTCFullYear(),
  }
}

// ── phone ───────────────────────────────────────────────────────────────────
/** Thai mobile -> E.164 (+66XXXXXXXXX), or null. Accepts 08x-xxx-xxxx, 668..., +668... */
export function normalizeThaiPhone(input) {
  if (typeof input !== 'string') return null
  let s = input.replace(/[\s\-().]/g, '')
  if (s.startsWith('+66')) s = s.slice(3)
  else if (s.startsWith('0066')) s = s.slice(4)
  else if (s.startsWith('66')) s = s.slice(2)
  else if (s.startsWith('0')) s = s.slice(1)
  else return null
  if (!/^[689]\d{8}$/.test(s)) return null
  return `+66${s}`
}

// ── consent ─────────────────────────────────────────────────────────────────
function toCE(year) {
  const y = Number(year)
  if (!Number.isInteger(y)) return null
  return y > 2400 ? y - 543 : y
}

/** Year-only birth data: adult only if certainly >= ADULT_AGE (conservative -> minors get the guardian step). */
export function isAdult(birthYear, now) {
  const by = toCE(birthYear)
  if (by === null) return false
  const age = bkk(now).year - by
  return age >= ADULT_AGE + 1
}

export function validBirthYear(birthYear, now) {
  const by = toCE(birthYear)
  if (by === null) return false
  const age = bkk(now).year - by
  return age >= 8 && age <= 100
}

export function validGuardian(g) {
  if (!g || typeof g !== 'object') return false
  const name = String(g.name || '').trim()
  const rel = String(g.relationship || '').trim()
  return name.length >= 2 && name.length <= 80 && rel.length >= 2 && rel.length <= 40 &&
    normalizeThaiPhone(g.phone) !== null && g.confirmed === true
}

/** Throws { code } on invalid input. Returns the consent record to store. */
export function buildConsent({ birthYear, guardian, accepted }, now) {
  if (accepted !== true) throw Object.assign(new Error('not accepted'), { code: 'consent_not_accepted' })
  if (!validBirthYear(birthYear, now)) throw Object.assign(new Error('bad birth year'), { code: 'bad_birth_year' })
  const record = {
    granted: true,
    version: CONSENT_VERSION,
    at: now,
    revokedAt: null,
    birthYear: toCE(birthYear),
    guardian: null,
  }
  if (!isAdult(birthYear, now)) {
    if (!validGuardian(guardian)) throw Object.assign(new Error('guardian required'), { code: 'guardian_required' })
    record.guardian = {
      name: String(guardian.name).trim(),
      relationship: String(guardian.relationship).trim(),
      phone: normalizeThaiPhone(guardian.phone),
      at: now,
    }
  }
  return record
}

export function consentValid(consent, now) {
  if (!consent || consent.granted !== true || consent.revokedAt) return false
  if (consent.version !== CONSENT_VERSION) return false
  if (!isAdult(consent.birthYear, now) && !validGuardian({ ...consent.guardian, confirmed: true })) return false
  return true
}

// ── trial / entitlement ─────────────────────────────────────────────────────
export function trialStatus(state, now) {
  if (state.paid) return { phase: 'paid', daysLeft: null }
  if (!state.trialStartedAt) return { phase: 'not_started', daysLeft: TRIAL_DAYS }
  const elapsedDays = (now - state.trialStartedAt) / 86400000
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays))
  return elapsedDays >= TRIAL_DAYS ? { phase: 'expired', daysLeft: 0 } : { phase: 'trial', daysLeft }
}

function rolled(state, now) {
  const k = bkk(now).dayKey
  const u = state.usage
  return u.dayKey === k ? u : { ...u, dayKey: k, daySeconds: 0, dayCalls: 0 }
}

function rollGlobal(g, now) {
  const k = bkk(now).dayKey
  return g.dayKey === k ? g : { dayKey: k, calls: 0, seconds: 0 }
}

/** Prune settled/old reservations (keep doc small). */
function prune(reservations, now) {
  const out = {}
  for (const [k, r] of Object.entries(reservations)) {
    if (!r.settled || now - r.at < 2 * 86400000) out[k] = r
  }
  return out
}

// ── Web Call reservation (transactional unit) ──────────────────────────────
/**
 * Decide if a Web Call token may be issued. Pure: returns the next state/global
 * plus a reservation to release to Retell. The reservation is charged in full up
 * front; the call_ended webhook refunds the unused part (settleCall).
 */
export function reserveWebCall(state, global, { now, limits, callKey }) {
  if (!consentValid(state.consent, now)) return { ok: false, reason: 'consent_required' }

  const st = state.trialStartedAt || state.paid ? state : { ...state, trialStartedAt: now }
  const tri = trialStatus(st, now)
  if (tri.phase === 'expired') return { ok: false, reason: 'trial_expired' }

  const u = rolled(st, now)
  if (now - (u.lastWebCallAt || 0) < limits.webMinGapSeconds * 1000) return { ok: false, reason: 'too_fast' }

  const want = limits.webCallSeconds
  const dayCap = tri.phase === 'paid' ? limits.paidWebSecondsPerDay : limits.trialWebSecondsPerDay
  // Reservations are charged up front into daySeconds/webSecondsUsed, so open ones are already counted.
  if (u.daySeconds + want > dayCap) return { ok: false, reason: 'daily_quota' }
  if (tri.phase === 'trial' && u.webSecondsUsed + want > limits.trialWebSeconds) {
    return { ok: false, reason: 'trial_quota' }
  }

  const g = rollGlobal(global, now)
  if (g.calls + 1 > limits.globalDailyCalls || g.seconds + want > limits.globalDailySeconds) {
    return { ok: false, reason: 'system_busy' }
  }

  return {
    ok: true,
    seconds: want,
    callKey,
    state: {
      ...st,
      usage: {
        ...u,
        webSecondsUsed: u.webSecondsUsed + want,
        daySeconds: u.daySeconds + want,
        dayCalls: u.dayCalls + 1,
        lastWebCallAt: now,
      },
      reservations: { ...prune(st.reservations, now), [callKey]: { seconds: want, at: now, settled: false, kind: 'web' } },
    },
    global: { dayKey: g.dayKey, calls: g.calls + 1, seconds: g.seconds + want },
  }
}

/** Mark a reservation settled with the real duration; refunds the unused seconds. Idempotent. */
export function settleCall(state, global, { callKey, actualSeconds }) {
  const r = state.reservations[callKey]
  if (!r || r.settled) return { changed: false, state, global }
  const actual = Math.max(0, Math.min(Number(actualSeconds) || 0, r.seconds))
  const refund = r.seconds - actual
  const u = state.usage
  const sameDay = bkk(r.at).dayKey === u.dayKey
  const g = global.dayKey === bkk(r.at).dayKey ? global : null
  return {
    changed: true,
    state: {
      ...state,
      usage: {
        ...u,
        webSecondsUsed: Math.max(0, u.webSecondsUsed - (r.kind === 'web' ? refund : 0)),
        daySeconds: sameDay ? Math.max(0, u.daySeconds - (r.kind === 'web' ? refund : 0)) : u.daySeconds,
      },
      reservations: { ...state.reservations, [callKey]: { ...r, settled: true, actualSeconds: actual } },
    },
    global: g ? { ...g, seconds: Math.max(0, g.seconds - refund) } : global,
  }
}

// ── outbound phone ──────────────────────────────────────────────────────────
export function inCallWindow(now) {
  const { hour } = bkk(now)
  return hour >= CALL_WINDOW.startHour && hour < CALL_WINDOW.endHour
}

/** Is a scheduled call due now for this user (not yet called today, within 2h after the chosen time)? */
export function scheduleDue(state, now) {
  const s = state.schedule
  if (!s || !Array.isArray(s.days) || !/^\d{2}:\d{2}$/.test(s.time || '')) return false
  const t = bkk(now)
  if (!s.days.includes(t.weekday)) return false
  const [hh, mm] = s.time.split(':').map(Number)
  const mins = t.hour * 60 + t.minute
  const target = hh * 60 + mm
  if (mins < target || mins > target + 120) return false
  const pc = state.phoneCalls
  return !(pc.dayKey === t.dayKey && pc.count >= 1)
}

export function validSchedule(s) {
  if (!s || !Array.isArray(s.days) || s.days.length < 1 || s.days.length > 7) return false
  if (!s.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return false
  const m = /^(\d{2}):(\d{2})$/.exec(s.time || '')
  if (!m) return false
  const h = Number(m[1]), mi = Number(m[2])
  return h >= CALL_WINDOW.startHour && h < CALL_WINDOW.endHour && mi < 60
}

/**
 * Every gate that must hold before an outbound call. Used by BOTH the scheduler
 * and the manual trigger; the UI is never trusted.
 * env: DIALING_ENABLED ('true' to dial), TEST_PHONE_OWN, DIAL_ONLY_TEST_PHONE (default restrict)
 */
export function canDialOut(state, global, { now, limits, env }) {
  if (env.DIALING_ENABLED !== 'true') return { ok: false, reason: 'dialing_disabled' }
  if (state.doNotCall) return { ok: false, reason: 'do_not_call' }
  if (!consentValid(state.consent, now)) return { ok: false, reason: 'consent_required' }
  if (!state.phone) return { ok: false, reason: 'no_phone' }
  if (!state.paid) return { ok: false, reason: 'not_paid' }   // trial = Web Call only
  if (env.DIAL_ONLY_TEST_PHONE !== 'false') {
    const own = normalizeThaiPhone(env.TEST_PHONE_OWN || '')
    if (!own || own !== state.phone) return { ok: false, reason: 'restricted_to_test_phone' }
  }
  if (!inCallWindow(now)) return { ok: false, reason: 'outside_call_window' }
  const k = bkk(now).dayKey
  const pc = state.phoneCalls
  if (pc.dayKey === k && pc.count >= limits.phoneCallsPerDay) return { ok: false, reason: 'user_daily_cap' }
  const g = rollGlobal(global, now)
  if (g.calls + 1 > limits.globalDailyCalls || g.seconds + limits.phoneCallSeconds > limits.globalDailySeconds) {
    return { ok: false, reason: 'system_cap' }
  }
  return { ok: true }
}

/** Reserve an outbound call (call after canDialOut ok). Charges global + user day counters up front. */
export function reservePhoneCall(state, global, { now, limits, callKey }) {
  const k = bkk(now).dayKey
  const pc = state.phoneCalls.dayKey === k ? state.phoneCalls : { dayKey: k, count: 0, lastCallAt: 0 }
  const g = rollGlobal(global, now)
  return {
    state: {
      ...state,
      phoneCalls: { dayKey: k, count: pc.count + 1, lastCallAt: now },
      reservations: {
        ...prune(state.reservations, now),
        [callKey]: { seconds: limits.phoneCallSeconds, at: now, settled: false, kind: 'phone' },
      },
      lastPhoneStatus: 'dialing',
    },
    global: { dayKey: g.dayKey, calls: g.calls + 1, seconds: g.seconds + limits.phoneCallSeconds },
  }
}

// ── sanitising client-provided dialog variables ─────────────────────────────
export function cleanVar(v, max, fallback) {
  // eslint-disable-next-line no-control-regex
  const s = String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
  return s || fallback
}

// Variables handed to the Retell agent (read as {{name}} in its prompt, see docs/voice-prompt.md).
//   student_name / study_plan   from the client (sanitised), study_plan = short goal summary
//   secretary_id                the secretary the student picked (validated; unknown -> default)
//   mode                        'outbound_reminder' (she calls) | 'inbound_support' (the student calls)
//   student_context             built on the server from the synced plan (never taken from the client)
export function dialogVars({ student_name, study_plan, secretary_id, mode, student_context }) {
  const callMode = CALL_MODES.includes(mode) ? mode : 'inbound_support'
  const id = validSecretaryId(secretary_id)
  const name = cleanVar(student_name, 40, 'เพื่อน')
  const secretary = secretaryName(id)
  return {
    student_name: name,
    study_plan: cleanVar(study_plan, 300, 'ยังไม่ได้ตั้งแผน TCAS'),
    secretary_id: id,
    secretary_name: secretary,
    call_mode: callMode,
    call_goal: CALL_GOALS[callMode],
    opening: OPENINGS[callMode](secretary, name),
    student_context: cleanVar(student_context, 900, 'ยังไม่มีข้อมูลแผนของน้อง'),
  }
}

/** Status object the client may see (no internals). */
export function publicStatus(state, global, { now, limits, env, mock }) {
  const tri = trialStatus(state, now)
  const u = rolled(state, now)
  const dayCap = tri.phase === 'paid' ? limits.paidWebSecondsPerDay : limits.trialWebSecondsPerDay
  return {
    mock: !!mock,
    consentValid: consentValid(state.consent, now),
    consentVersion: CONSENT_VERSION,
    needsGuardian: state.consent ? !isAdult(state.consent.birthYear, now) : null,
    phone: state.phone ? state.phone.replace(/^(\+66\d)\d{5}(\d{3})$/, '$1•••••$2') : null,
    schedule: state.schedule,
    doNotCall: state.doNotCall,
    trial: tri,
    paid: state.paid,
    webSecondsLeftToday: Math.max(0, dayCap - u.daySeconds),
    trialSecondsLeft: tri.phase === 'trial' || tri.phase === 'not_started'
      ? Math.max(0, limits.trialWebSeconds - u.webSecondsUsed) : null,
    dialingAvailable: env.DIALING_ENABLED === 'true' && state.paid,
    lastPhoneStatus: state.lastPhoneStatus,
  }
}
