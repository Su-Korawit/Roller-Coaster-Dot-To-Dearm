import { describe, it, expect } from 'vitest'
import {
  CONSENT_VERSION, DEFAULT_LIMITS as L, emptyState, emptyGlobal, normalizeThaiPhone, isAdult,
  buildConsent, consentValid, trialStatus, reserveWebCall, settleCall, canDialOut, reservePhoneCall,
  scheduleDue, validSchedule, dialogVars, bkk,
} from './logic.js'

// 2026-11-06 12:00 Bangkok (Friday) = 05:00Z
const NOW = Date.UTC(2026, 10, 6, 5, 0, 0)
const guardian = { name: 'สมชาย ใจดี', relationship: 'บิดา', phone: '0812345678', confirmed: true }

function consented(extra = {}) {
  return { ...emptyState(), consent: buildConsent({ birthYear: 1990, accepted: true }, NOW), ...extra }
}

describe('normalizeThaiPhone', () => {
  it('accepts common Thai mobile formats', () => {
    expect(normalizeThaiPhone('081-234-5678')).toBe('+66812345678')
    expect(normalizeThaiPhone('+66 81 234 5678')).toBe('+66812345678')
    expect(normalizeThaiPhone('66912345678')).toBe('+66912345678')
  })
  it('rejects bad numbers', () => {
    expect(normalizeThaiPhone('0212345678')).toBeNull()
    expect(normalizeThaiPhone('12345')).toBeNull()
    expect(normalizeThaiPhone('+14155550123')).toBeNull()
    expect(normalizeThaiPhone(null)).toBeNull()
  })
})

describe('consent', () => {
  it('adult (BE birth year) needs no guardian', () => {
    expect(isAdult(2533, NOW)).toBe(true)
    const c = buildConsent({ birthYear: 2533, accepted: true }, NOW)
    expect(c.version).toBe(CONSENT_VERSION)
    expect(consentValid(c, NOW)).toBe(true)
  })
  it('minor without guardian is rejected', () => {
    expect(() => buildConsent({ birthYear: 2010, accepted: true }, NOW)).toThrow(/guardian/)
  })
  it('minor with guardian ok; year-only 20-year-old is treated as minor (conservative)', () => {
    expect(consentValid(buildConsent({ birthYear: 2010, accepted: true, guardian }, NOW), NOW)).toBe(true)
    expect(isAdult(2006, NOW)).toBe(false)
  })
  it('requires explicit acceptance and sane birth year', () => {
    expect(() => buildConsent({ birthYear: 1990, accepted: false }, NOW)).toThrow()
    expect(() => buildConsent({ birthYear: 2025, accepted: true }, NOW)).toThrow()
  })
  it('revoked or old-version consent is invalid', () => {
    const c = buildConsent({ birthYear: 1990, accepted: true }, NOW)
    expect(consentValid({ ...c, revokedAt: NOW }, NOW)).toBe(false)
    expect(consentValid({ ...c, version: 'old' }, NOW)).toBe(false)
    expect(consentValid(null, NOW)).toBe(false)
  })
})

describe('trial + web call reservation', () => {
  it('refuses without consent', () => {
    const r = reserveWebCall(emptyState(), emptyGlobal(), { now: NOW, limits: L, callKey: 'a' })
    expect(r).toMatchObject({ ok: false, reason: 'consent_required' })
  })
  it('first call starts the trial and charges the reservation', () => {
    const r = reserveWebCall(consented(), emptyGlobal(), { now: NOW, limits: L, callKey: 'a' })
    expect(r.ok).toBe(true)
    expect(r.state.trialStartedAt).toBe(NOW)
    expect(r.state.usage.webSecondsUsed).toBe(L.webCallSeconds)
    expect(r.global.calls).toBe(1)
  })
  it('rate-limits calls issued too quickly', () => {
    const a = reserveWebCall(consented(), emptyGlobal(), { now: NOW, limits: L, callKey: 'a' })
    const b = reserveWebCall(a.state, a.global, { now: NOW + 2000, limits: L, callKey: 'b' })
    expect(b).toMatchObject({ ok: false, reason: 'too_fast' })
  })
  it('enforces daily trial quota', () => {
    let s = consented(), g = emptyGlobal(), t = NOW, ok = 0
    for (let i = 0; i < 5; i++) {
      const r = reserveWebCall(s, g, { now: t, limits: L, callKey: 'k' + i })
      if (!r.ok) { expect(r.reason).toBe('daily_quota'); break }
      ok++; s = r.state; g = r.global; t += 60000
    }
    expect(ok).toBe(Math.floor(L.trialWebSecondsPerDay / L.webCallSeconds))
  })
  it('trial expires after 3 days', () => {
    const s = consented({ trialStartedAt: NOW - 4 * 86400000 })
    expect(trialStatus(s, NOW).phase).toBe('expired')
    expect(reserveWebCall(s, emptyGlobal(), { now: NOW, limits: L, callKey: 'a' })).toMatchObject({ ok: false, reason: 'trial_expired' })
  })
  it('paid users bypass trial expiry', () => {
    const s = consented({ trialStartedAt: NOW - 9 * 86400000, paid: true })
    expect(reserveWebCall(s, emptyGlobal(), { now: NOW, limits: L, callKey: 'a' }).ok).toBe(true)
  })
  it('global ceiling blocks everyone', () => {
    const g = { dayKey: bkk(NOW).dayKey, calls: L.globalDailyCalls, seconds: 0 }
    expect(reserveWebCall(consented(), g, { now: NOW, limits: L, callKey: 'a' })).toMatchObject({ ok: false, reason: 'system_busy' })
  })
  it('settle refunds unused seconds once (idempotent) and never exceeds the reservation', () => {
    const r = reserveWebCall(consented(), emptyGlobal(), { now: NOW, limits: L, callKey: 'a' })
    const s1 = settleCall(r.state, r.global, { callKey: 'a', actualSeconds: 20, now: NOW })
    expect(s1.state.usage.webSecondsUsed).toBe(20)
    expect(s1.global.seconds).toBe(20)
    const s2 = settleCall(s1.state, s1.global, { callKey: 'a', actualSeconds: 0, now: NOW })
    expect(s2.changed).toBe(false)
    const over = settleCall(r.state, r.global, { callKey: 'a', actualSeconds: 99999, now: NOW })
    expect(over.state.usage.webSecondsUsed).toBe(L.webCallSeconds)
  })
})

describe('outbound phone gates', () => {
  const own = '0899999999'
  const env = { DIALING_ENABLED: 'true', TEST_PHONE_OWN: own }
  const ready = () => consented({ phone: normalizeThaiPhone(own), paid: true })
  const g0 = emptyGlobal()

  it('is OFF by default', () => {
    expect(canDialOut(ready(), g0, { now: NOW, limits: L, env: {} })).toMatchObject({ ok: false, reason: 'dialing_disabled' })
  })
  it('allows a fully-qualified call to the own test phone', () => {
    expect(canDialOut(ready(), g0, { now: NOW, limits: L, env }).ok).toBe(true)
  })
  it('never dials without valid consent, even when everything else is ready', () => {
    const s = { ...ready(), consent: null }
    expect(canDialOut(s, g0, { now: NOW, limits: L, env })).toMatchObject({ reason: 'consent_required' })
  })
  it('honours do-not-call', () => {
    expect(canDialOut({ ...ready(), doNotCall: true }, g0, { now: NOW, limits: L, env })).toMatchObject({ reason: 'do_not_call' })
  })
  it('trial users are Web Call only', () => {
    expect(canDialOut({ ...ready(), paid: false }, g0, { now: NOW, limits: L, env })).toMatchObject({ reason: 'not_paid' })
  })
  it('refuses any number other than TEST_PHONE_OWN while restricted', () => {
    const s = { ...ready(), phone: '+66811111111' }
    expect(canDialOut(s, g0, { now: NOW, limits: L, env })).toMatchObject({ reason: 'restricted_to_test_phone' })
    expect(canDialOut(s, g0, { now: NOW, limits: L, env: { ...env, DIAL_ONLY_TEST_PHONE: 'false' } }).ok).toBe(true)
  })
  it('missing TEST_PHONE_OWN while restricted -> refuse', () => {
    expect(canDialOut(ready(), g0, { now: NOW, limits: L, env: { DIALING_ENABLED: 'true' } })).toMatchObject({ reason: 'restricted_to_test_phone' })
  })
  it('respects call window (Bangkok 06-22)', () => {
    const night = Date.UTC(2026, 10, 6, 16, 0, 0) // 23:00 BKK
    expect(canDialOut(ready(), g0, { now: night, limits: L, env })).toMatchObject({ reason: 'outside_call_window' })
    const at = (h, m = 0) => Date.UTC(2026, 10, 6, h - 7, m, 0)
    expect(canDialOut(ready(), g0, { now: at(5, 59), limits: L, env })).toMatchObject({ reason: 'outside_call_window' })
    expect(canDialOut(ready(), g0, { now: at(6), limits: L, env }).ok).toBe(true)
    expect(canDialOut(ready(), g0, { now: at(21, 59), limits: L, env }).ok).toBe(true)
    expect(canDialOut(ready(), g0, { now: at(22), limits: L, env })).toMatchObject({ reason: 'outside_call_window' })
  })
  it('per-user and global daily caps', () => {
    const r = reservePhoneCall(ready(), g0, { now: NOW, limits: L, callKey: 'p1' })
    expect(canDialOut(r.state, r.global, { now: NOW, limits: L, env })).toMatchObject({ reason: 'user_daily_cap' })
    const full = { dayKey: bkk(NOW).dayKey, calls: L.globalDailyCalls, seconds: 0 }
    expect(canDialOut(ready(), full, { now: NOW, limits: L, env })).toMatchObject({ reason: 'system_cap' })
  })
})

describe('schedule', () => {
  it('validates days/time inside the call window', () => {
    expect(validSchedule({ days: [1, 3, 5], time: '18:30' })).toBe(true)
    expect(validSchedule({ days: [1], time: '23:00' })).toBe(false)
    expect(validSchedule({ days: [1], time: '06:00' })).toBe(true)
    expect(validSchedule({ days: [1], time: '21:59' })).toBe(true)
    expect(validSchedule({ days: [1], time: '22:00' })).toBe(false)
    expect(validSchedule({ days: [1], time: '05:59' })).toBe(false)
    expect(validSchedule({ days: [], time: '18:30' })).toBe(false)
    expect(validSchedule({ days: [9], time: '18:30' })).toBe(false)
  })
  it('due on chosen weekday within 2h after time, once per day', () => {
    // NOW = Friday 12:00 BKK
    const s = consented({ schedule: { days: [5], time: '11:30' } })
    expect(scheduleDue(s, NOW)).toBe(true)
    expect(scheduleDue({ ...s, schedule: { days: [4], time: '11:30' } }, NOW)).toBe(false)
    expect(scheduleDue({ ...s, schedule: { days: [5], time: '13:00' } }, NOW)).toBe(false)
    const called = { ...s, phoneCalls: { dayKey: bkk(NOW).dayKey, count: 1, lastCallAt: NOW } }
    expect(scheduleDue(called, NOW)).toBe(false)
  })
})

describe('dialogVars', () => {
  it('sanitises and falls back politely', () => {
    const d = dialogVars({})
    expect(d).toMatchObject({ student_name: 'เพื่อน', study_plan: 'ยังไม่ได้ตั้งแผน TCAS', secretary_id: 'jaidee', secretary_name: 'พี่ใจดี', call_mode: 'inbound_support' })
    expect(d.student_context).toBe('ยังไม่มีข้อมูลแผนของน้อง')
    expect(dialogVars({ student_name: 'มะลิ\n\x00', study_plan: 'a'.repeat(999) }).study_plan.length).toBe(300)
  })
  it('outbound and inbound calls get different goals and openings', () => {
    const out = dialogVars({ student_name: 'มะลิ', mode: 'outbound_reminder', secretary_id: 'dao' })
    const inn = dialogVars({ student_name: 'มะลิ', mode: 'inbound_support', secretary_id: 'dao' })
    expect(out.call_goal).not.toBe(inn.call_goal)
    expect(out.opening).toContain('โทรมาตามเวลาที่นัด')
    expect(inn.opening).toContain('อยากเล่าให้พี่ฟัง')
    expect(out.secretary_name).toBe('พี่ดาว')
    expect(inn.call_goal).toContain('1323')
  })
  it('unknown secretary / mode fall back instead of reaching the agent', () => {
    const d = dialogVars({ secretary_id: 'hacker', mode: 'evil' })
    expect(d.secretary_id).toBe('jaidee')
    expect(d.call_mode).toBe('inbound_support')
  })
})
