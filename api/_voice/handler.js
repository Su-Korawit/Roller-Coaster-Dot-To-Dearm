// api/_voice/handler.js — request handling for /api/voice/:action, with injected deps
// so it is unit-testable (deps: store, retell, env, now, randomId).
// Rules: uid comes ONLY from the verified Firebase ID token; consent, quota, phone
// allow-list and ceilings are decided here, never by the client.
import crypto from 'node:crypto'
import { Buffer } from 'node:buffer'
import {
  limitsFromEnv, buildConsent, consentValid, normalizeThaiPhone, validSchedule, reserveWebCall,
  settleCall, canDialOut, reservePhoneCall, scheduleDue, dialogVars, publicStatus, bkk,
} from './logic.js'

const HTTP = {
  consent_required: 403, consent_not_accepted: 400, bad_birth_year: 400, guardian_required: 400,
  trial_expired: 402, daily_quota: 429, trial_quota: 429, too_fast: 429, system_busy: 429,
  bad_phone: 400, bad_schedule: 400, bad_request: 400, unauthorized: 401, rate_limited: 429,
  voice_unavailable: 503, upstream_failed: 502, not_found: 404, method_not_allowed: 405,
}

export function isProd(env) {
  return env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production'
}

/** 'live' | 'mock' | 'off' — mock only outside production; production without a key refuses service. */
export function voiceMode(env) {
  if (env.RETELL_API_KEY && env.RETELL_AGENT_ID) return 'live'
  return isProd(env) ? 'off' : 'mock'
}

function send(res, code, body) {
  res.status(code).setHeader('Cache-Control', 'no-store')
  res.json(body)
}
const fail = (res, error) => send(res, HTTP[error] || 400, { ok: false, error })

function bearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || ''
  return h.startsWith('Bearer ') ? h.slice(7) : ''
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

const TERMINAL = new Set(['answered', 'no_answer', 'busy', 'failed', 'declined', 'voicemail', 'error'])
function phoneStatusFrom(reason) {
  const map = {
    dial_no_answer: 'no_answer', dial_busy: 'busy', dial_failed: 'failed', user_declined: 'declined',
    voicemail_reached: 'voicemail', invalid_destination: 'failed', telephony_provider_permission_denied: 'failed',
    error_unknown: 'error',
  }
  return map[reason] || 'answered'
}

export function createVoiceHandler(deps) {
  const { store, retell } = deps
  // per-instance burst limiter; the authoritative limits are the transactional quotas
  const rateBuckets = new Map()
  function burstLimited(uid, now) {
    const arr = (rateBuckets.get(uid) || []).filter((t) => now - t < 60000)
    arr.push(now)
    rateBuckets.set(uid, arr)
    return arr.length > 20
  }
  const env = () => deps.env
  const now = () => (deps.now ? deps.now() : Date.now())
  const rid = () => (deps.randomId ? deps.randomId() : crypto.randomUUID())

  // ── dialing (shared by the scheduler and the manual trigger) ──────────────
  async function dialUser(uid, { ignoreSchedule = false } = {}) {
    const e = env(), t = now(), limits = limitsFromEnv(e)
    const mode = voiceMode(e)
    const callKey = rid()
    const decision = await store.tx(uid, t, (state, global) => {
      const gate = canDialOut(state, global, { now: t, limits, env: e })
      if (!gate.ok) return { result: gate }
      if (!ignoreSchedule && !scheduleDue(state, t)) return { result: { ok: false, reason: 'not_due' } }
      const r = reservePhoneCall(state, global, { now: t, limits, callKey })
      return { state: r.state, global: r.global, result: { ok: true, phone: state.phone, profile: state.profile } }
    })
    if (!decision.ok) return decision
    if (mode !== 'live' || !e.RETELL_FROM_NUMBER) {
      await store.tx(uid, t, (state, global) => {
        const s = settleCall(state, global, { callKey, actualSeconds: 0, now: t })
        return { state: { ...s.state, lastPhoneStatus: 'mock_skipped' }, global: s.global, result: null }
      })
      return { ok: false, reason: 'not_live' }
    }
    // narrow the revoke/stop race: re-read right before the external call
    const fresh = await store.read(uid)
    if (fresh.doNotCall || !consentValid(fresh.consent, t) || fresh.phone !== decision.phone) {
      await store.tx(uid, t, (state, global) => {
        const s = settleCall(state, global, { callKey, actualSeconds: 0, now: t })
        return { state: s.state, global: s.global, result: null }
      })
      return { ok: false, reason: 'revoked_before_dial' }
    }
    const v = dialogVars(decision.profile || {})
    try {
      await retell.createPhoneCall({
        apiKey: e.RETELL_API_KEY, agentId: e.RETELL_AGENT_ID, fromNumber: e.RETELL_FROM_NUMBER,
        toNumber: decision.phone, vars: v, metadata: { uid, callKey, kind: 'phone' }, idempotencyKey: callKey,
      })
      return { ok: true }
    } catch (err) {
      if (err.status && err.status >= 400 && err.status < 500) {
        // definite refusal -> nothing was dialed, refund the reservation
        await store.tx(uid, t, (state, global) => {
          const s = settleCall(state, global, { callKey, actualSeconds: 0, now: t })
          return { state: { ...s.state, lastPhoneStatus: 'failed' }, global: s.global, result: null }
        })
        return { ok: false, reason: 'upstream_refused' }
      }
      // ambiguous (timeout/5xx): keep the reservation charged, mark for review; do not auto-retry
      await store.tx(uid, t, (state) => ({ state: { ...state, lastPhoneStatus: 'unknown' }, result: null }))
      return { ok: false, reason: 'upstream_unknown' }
    }
  }

  return async function handle(req, res) {
    const action = String(req.query?.action || '')
    const e = env(), t = now(), limits = limitsFromEnv(e)

    // ── Retell webhook: authenticated by signature, not by Firebase token ───
    if (action === 'webhook') {
      if (req.method !== 'POST') return fail(res, 'method_not_allowed')
      if (!e.RETELL_API_KEY) return fail(res, 'voice_unavailable')
      const ok = await retell.verifyWebhook(req.body, e.RETELL_API_KEY, req.headers['x-retell-signature'])
      if (!ok) return send(res, 401, { ok: false, error: 'bad_signature' })
      const ev = req.body?.event
      const call = req.body?.call || {}
      const md = call.metadata || {}
      if (!md.uid || !md.callKey) return send(res, 200, { ok: true, ignored: true })
      if (ev === 'call_ended') {
        const seconds = Math.round((Number(call.duration_ms) || (call.end_timestamp - call.start_timestamp) || 0) / 1000)
        await store.tx(md.uid, t, (state, global) => {
          const s = settleCall(state, global, { callKey: md.callKey, actualSeconds: seconds, now: t })
          let next = s.state
          if (md.kind === 'phone' && !TERMINAL.has(state.lastPhoneStatus)) {
            next = { ...next, lastPhoneStatus: phoneStatusFrom(call.disconnection_reason) }
          }
          return { state: next, global: s.global, result: null }
        })
      } else if (ev === 'call_analyzed') {
        // optional: the agent's post-call analysis may extract the callback time the student asked for
        const cb = call.call_analysis?.custom_analysis_data?.callback_time
        if (typeof cb === 'string' && /^\d{2}:\d{2}$/.test(cb)) {
          await store.tx(md.uid, t, (state) => {
            const r = state.reservations[md.callKey]
            // only for a call we issued, only once (replayed webhooks must not rewind the schedule)
            if (!r || r.analyzed) return { result: null }
            const marked = { ...state, reservations: { ...state.reservations, [md.callKey]: { ...r, analyzed: true } } }
            if (!state.schedule || state.doNotCall || !validSchedule({ days: state.schedule.days, time: cb })) return { state: marked, result: null }
            return { state: { ...marked, schedule: { ...state.schedule, time: cb } }, result: null }
          })
        }
      }
      return send(res, 200, { ok: true })
    }

    // ── Scheduler / manual trigger: authenticated by CRON_SECRET ────────────
    if (action === 'dial-due') {
      if (!e.CRON_SECRET || !safeEqual(bearer(req), e.CRON_SECRET)) return send(res, 401, { ok: false, error: 'unauthorized' })
      if (e.DIALING_ENABLED !== 'true') return send(res, 200, { ok: true, dialed: 0, disabled: true })
      const only = req.body?.uid ? [String(req.body.uid)] : await store.listDialReady(bkk(t).weekday)
      const results = []
      for (const uid of only) results.push(await dialUser(uid, { ignoreSchedule: !!req.body?.uid }))
      return send(res, 200, { ok: true, dialed: results.filter((r) => r.ok).length, checked: results.length })
    }

    // ── everything else needs a verified Firebase user ──────────────────────
    let uid
    try {
      const tok = bearer(req)
      if (!tok) return fail(res, 'unauthorized')
      uid = await store.verifyToken(tok)
    } catch {
      return fail(res, 'unauthorized')
    }
    if (burstLimited(uid, t)) return fail(res, 'rate_limited')
    const mode = voiceMode(e)

    if (action === 'status') {
      if (req.method !== 'GET') return fail(res, 'method_not_allowed')
      const [state, global] = await Promise.all([store.read(uid), store.readGlobal(t)])
      return send(res, 200, { ok: true, status: publicStatus(state, global, { now: t, limits, env: e, mock: mode !== 'live' }), mode })
    }

    if (req.method !== 'POST') return fail(res, 'method_not_allowed')
    const body = req.body && typeof req.body === 'object' ? req.body : {}

    if (action === 'consent') {
      let record
      try { record = buildConsent(body, t) } catch (err) { return fail(res, err.code || 'bad_request') }
      await store.tx(uid, t, (state) => ({ state: { ...state, consent: record, doNotCall: false }, result: null }))
      return send(res, 200, { ok: true })
    }

    if (action === 'revoke') {
      // withdraw consent: keep the consent record (proof of withdrawal), erase phone + schedule, stop calls
      await store.tx(uid, t, (state) => ({
        state: { ...state, consent: state.consent ? { ...state.consent, revokedAt: t } : null, phone: null, schedule: null, profile: null, doNotCall: true },
        result: null,
      }))
      return send(res, 200, { ok: true })
    }

    if (action === 'stop' || action === 'resume') {
      const stopping = action === 'stop'
      const r = await store.tx(uid, t, (state) => {
        if (!stopping && !consentValid(state.consent, t)) return { result: { error: 'consent_required' } }
        return { state: { ...state, doNotCall: stopping }, result: {} }
      })
      return r.error ? fail(res, r.error) : send(res, 200, { ok: true })
    }

    if (action === 'phone') {
      const phone = body.phone === null || body.phone === '' ? null : normalizeThaiPhone(body.phone)
      if (body.phone && !phone) return fail(res, 'bad_phone')
      const r = await store.tx(uid, t, (state) => {
        if (phone && !consentValid(state.consent, t)) return { result: { error: 'consent_required' } }
        return { state: { ...state, phone }, result: {} }
      })
      return r.error ? fail(res, r.error) : send(res, 200, { ok: true })
    }

    if (action === 'schedule') {
      const sched = body.schedule === null ? null : { days: body.days, time: body.time }
      if (sched && !validSchedule(sched)) return fail(res, 'bad_schedule')
      const r = await store.tx(uid, t, (state) => {
        if (sched && !consentValid(state.consent, t)) return { result: { error: 'consent_required' } }
        const profile = sched ? dialogVars(body) : null // only what the call script needs, kept while a schedule exists
        return { state: { ...state, profile, schedule: sched ? { days: [...new Set(sched.days)].sort(), time: sched.time } : null }, result: {} }
      })
      return r.error ? fail(res, r.error) : send(res, 200, { ok: true })
    }

    if (action === 'web-call') {
      if (mode === 'off') return fail(res, 'voice_unavailable')
      const callKey = rid()
      const r = await store.tx(uid, t, (state, global) => {
        const x = reserveWebCall(state, global, { now: t, limits, callKey })
        return x.ok ? { state: x.state, global: x.global, result: x } : { result: x }
      })
      if (!r.ok) return fail(res, r.reason)
      const vars = dialogVars(body)
      const refund = () => store.tx(uid, t, (state, global) => {
        const s = settleCall(state, global, { callKey, actualSeconds: 0, now: t })
        return { state: s.state, global: s.global, result: null }
      })
      if (mode === 'mock') {
        await refund() // nothing real was spent
        return send(res, 200, { ok: true, mock: true, access_token: `mock_${callKey}`, call_id: `mock_${callKey}`, reservedSeconds: r.seconds, vars })
      }
      try {
        const out = await retell.createWebCall({
          apiKey: e.RETELL_API_KEY, agentId: e.RETELL_AGENT_ID, vars, metadata: { uid, callKey, kind: 'web' },
        })
        return send(res, 200, {
          ok: true, mock: false, access_token: out.access_token, call_id: out.call_id,
          transport: out.transport, ice_servers: out.ice_servers, reservedSeconds: r.seconds,
        })
      } catch {
        await refund()
        return fail(res, 'upstream_failed')
      }
    }

    return fail(res, 'not_found')
  }
}
