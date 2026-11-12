import { describe, it, expect, vi } from 'vitest'
import { createVoiceHandler, voiceMode } from './handler.js'
import { createMemoryStore } from './store.js'
import { bkk } from './logic.js'

const NOW = Date.UTC(2026, 10, 6, 5, 0, 0) // Fri 12:00 BKK
const OWN = '0899999999'

function mkRes() {
  const r = { code: 200, body: null, headers: {} }
  r.status = (c) => { r.code = c; return r }
  r.setHeader = (k, v) => { r.headers[k] = v }
  r.json = (b) => { r.body = b }
  return r
}

function setup(envOver = {}, retellOver = {}) {
  const store = createMemoryStore()
  let clock = NOW
  let n = 0
  const retell = {
    createWebCall: vi.fn(async () => ({ access_token: 'tok_real', call_id: 'call_1' })),
    createPhoneCall: vi.fn(async () => ({ call_id: 'phone_1' })),
    verifyWebhook: vi.fn(async () => true),
    ...retellOver,
  }
  const env = { ...envOver }
  const handler = createVoiceHandler({ store, retell, env, now: () => clock, randomId: () => `k${++n}` })
  const call = async (action, { method = 'POST', body, uid = 'u1', headers = {}, auth = true } = {}) => {
    const res = mkRes()
    const h = { ...(auth ? { authorization: `Bearer uid:${uid}` } : {}), ...headers }
    await handler({ method, query: { action }, body, headers: h }, res)
    return res
  }
  return { store, retell, env, call, advance: (ms) => { clock += ms }, setClock: (v) => { clock = v } }
}

const adult = { birthYear: 1990, accepted: true }

describe('voiceMode', () => {
  it('mock outside production, off in production without a key, live with key', () => {
    expect(voiceMode({})).toBe('mock')
    expect(voiceMode({ VERCEL_ENV: 'production' })).toBe('off')
    expect(voiceMode({ RETELL_API_KEY: 'x', RETELL_AGENT_ID: 'a' })).toBe('live')
  })
})

describe('auth', () => {
  it('rejects requests without a valid token', async () => {
    const { call } = setup()
    expect((await call('status', { method: 'GET', auth: false })).code).toBe(401)
    expect((await call('web-call', { auth: false })).code).toBe(401)
  })
})

describe('web-call', () => {
  it('requires consent', async () => {
    const { call } = setup()
    const r = await call('web-call', { body: {} })
    expect(r.code).toBe(403)
    expect(r.body.error).toBe('consent_required')
  })

  it('mock mode returns a mock token without calling Retell, and refunds quota', async () => {
    const { call, retell } = setup()
    await call('consent', { body: adult })
    const r = await call('web-call', { body: { student_name: 'มะลิ', study_plan: 'วิศวะ จุฬา' } })
    expect(r.code).toBe(200)
    expect(r.body).toMatchObject({ ok: true, mock: true })
    expect(retell.createWebCall).not.toHaveBeenCalled()
    const st = await call('status', { method: 'GET' })
    expect(st.body.status.trialSecondsLeft).toBe(600)
  })

  it('production without a key refuses (503), never mock', async () => {
    const { call } = setup({ VERCEL_ENV: 'production' })
    await call('consent', { body: adult })
    expect((await call('web-call', { body: {} })).code).toBe(503)
  })

  it('live mode passes server-built vars + metadata and returns the token', async () => {
    const { call, retell } = setup({ RETELL_API_KEY: 'k', RETELL_AGENT_ID: 'agent_x' })
    await call('consent', { body: adult })
    const r = await call('web-call', { body: { student_name: 'มะลิ', study_plan: 'แผน', uid: 'evil' } })
    expect(r.body).toMatchObject({ ok: true, mock: false, access_token: 'tok_real' })
    const arg = retell.createWebCall.mock.calls[0][0]
    expect(arg.agentId).toBe('agent_x')
    expect(arg.vars).toMatchObject({ student_name: 'มะลิ', study_plan: 'แผน', call_mode: 'inbound_support', secretary_id: 'jaidee', secretary_name: 'พี่ใจดี' })
    expect(arg.vars.call_goal).toContain('น้องเป็นฝ่ายโทรหาพี่เอง')
    expect(arg.metadata.uid).toBe('u1') // from token, not from the body
    expect(JSON.stringify(r.body)).not.toContain('"k"')
  })

  it('web call: the chosen secretary and the plan read on the SERVER (not the client) reach the agent', async () => {
    const { call, retell, store } = setup({ RETELL_API_KEY: 'k', RETELL_AGENT_ID: 'agent_x' })
    store.osData.set('u1', { target: { faculty: 'วิศวะ', examDate: '2026-11-16' }, tasks: [{ date: '2026-11-06', text: 'ทำข้อสอบฟิสิกส์', done: false }] })
    await call('consent', { body: adult })
    await call('web-call', { body: { student_name: 'มะลิ', secretary_id: 'mali', student_context: 'ข้อมูลปลอมจาก client' } })
    const v = retell.createWebCall.mock.calls[0][0].vars
    expect(v.secretary_name).toBe('พี่มะลิ')
    expect(v.student_context).toContain('วิศวะ')
    expect(v.student_context).toContain('ทำข้อสอบฟิสิกส์')
    expect(v.student_context).not.toContain('ปลอม')
  })

  it('upstream failure refunds the reservation', async () => {
    const { call } = setup({ RETELL_API_KEY: 'k', RETELL_AGENT_ID: 'a' }, { createWebCall: vi.fn(async () => { throw Object.assign(new Error('x'), { status: 500 }) }) })
    await call('consent', { body: adult })
    expect((await call('web-call', { body: {} })).code).toBe(502)
    const st = await call('status', { method: 'GET' })
    expect(st.body.status.trialSecondsLeft).toBe(600)
  })

  it('parallel requests cannot both pass the rate limit / quota', async () => {
    const { call } = setup({ RETELL_API_KEY: 'k', RETELL_AGENT_ID: 'a' })
    await call('consent', { body: adult })
    const rs = await Promise.all([call('web-call', { body: {} }), call('web-call', { body: {} })])
    expect(rs.map((r) => r.code).sort()).toEqual([200, 429])
  })

  it('webhook call_ended settles to actual seconds', async () => {
    const { call, advance } = setup({ RETELL_API_KEY: 'k', RETELL_AGENT_ID: 'a' })
    await call('consent', { body: adult })
    const w = await call('web-call', { body: {} })
    expect(w.code).toBe(200)
    const wh = await call('webhook', { auth: false, headers: { 'x-retell-signature': 'sig' }, body: { event: 'call_ended', call: { duration_ms: 30000, metadata: { uid: 'u1', callKey: 'k1', kind: 'web' } } } })
    expect(wh.code).toBe(200)
    advance(1000)
    const st = await call('status', { method: 'GET' })
    expect(st.body.status.trialSecondsLeft).toBe(600 - 30)
  })

  it('webhook with bad signature is rejected', async () => {
    const { call } = setup({ RETELL_API_KEY: 'k', RETELL_AGENT_ID: 'a' }, { verifyWebhook: vi.fn(async () => false) })
    const wh = await call('webhook', { auth: false, headers: { 'x-retell-signature': 'bad' }, body: { event: 'call_ended', call: { metadata: { uid: 'u1', callKey: 'k1' } } } })
    expect(wh.code).toBe(401)
  })
})

describe('consent / settings', () => {
  it('minor needs guardian', async () => {
    const { call } = setup()
    expect((await call('consent', { body: { birthYear: 2016, accepted: true } })).body.error).toBe('guardian_required')
    const ok = await call('consent', { body: { birthYear: 2016, accepted: true, guardian: { name: 'สมชาย ใจดี', relationship: 'บิดา', phone: '0812345678', confirmed: true } } })
    expect(ok.code).toBe(200)
  })

  it('phone + schedule need consent and validate input; status masks the phone', async () => {
    const { call } = setup()
    expect((await call('phone', { body: { phone: OWN } })).body.error).toBe('consent_required')
    await call('consent', { body: adult })
    expect((await call('phone', { body: { phone: '123' } })).body.error).toBe('bad_phone')
    expect((await call('phone', { body: { phone: OWN } })).code).toBe(200)
    expect((await call('schedule', { body: { days: [1], time: '23:30' } })).body.error).toBe('bad_schedule')
    expect((await call('schedule', { body: { days: [1, 3, 5], time: '18:30' } })).code).toBe(200)
    const st = (await call('status', { method: 'GET' })).body.status
    expect(st.phone).toMatch(/•/)
    expect(st.phone).not.toContain(OWN.slice(1, 8))
  })

  it('revoke erases phone + schedule and blocks everything', async () => {
    const { call, store } = setup()
    await call('consent', { body: adult })
    await call('phone', { body: { phone: OWN } })
    await call('schedule', { body: { days: [5], time: '11:00' } })
    await call('revoke', { body: {} })
    const s = await store.read('u1')
    expect(s).toMatchObject({ phone: null, schedule: null, doNotCall: true })
    expect((await call('web-call', { body: {} })).code).toBe(403)
  })
})

describe('dial-due (outbound)', () => {
  const live = { RETELL_API_KEY: 'k', RETELL_AGENT_ID: 'a', RETELL_FROM_NUMBER: '+13192641997', TEST_PHONE_OWN: OWN, CRON_SECRET: 's3cret' }

  async function ready(s) {
    await s.call('consent', { body: adult })
    await s.call('phone', { body: { phone: OWN } })
    await s.call('schedule', { body: { days: [bkk(NOW).weekday], time: '11:30', student_name: 'มะลิ', study_plan: 'แผน' } })
    const st = await s.store.read('u1')
    s.store.users.set('u1', { ...st, paid: true, dialReady: true })
  }
  const cron = (s, over = {}) => s.call('dial-due', { auth: false, headers: { authorization: 'Bearer s3cret' }, body: {}, ...over })

  it('requires the secret', async () => {
    const s = setup({ ...live, DIALING_ENABLED: 'true' })
    expect((await s.call('dial-due', { auth: false, headers: { authorization: 'Bearer nope' }, body: {} })).code).toBe(401)
  })

  it('does nothing while DIALING_ENABLED is not true (default)', async () => {
    const s = setup(live)
    await ready(s)
    const r = await cron(s)
    expect(r.body).toMatchObject({ disabled: true, dialed: 0 })
    expect(s.retell.createPhoneCall).not.toHaveBeenCalled()
  })

  it('dials the own test phone once, with server-held vars', async () => {
    const s = setup({ ...live, DIALING_ENABLED: 'true' })
    await ready(s)
    expect((await cron(s)).body.dialed).toBe(1)
    const arg = s.retell.createPhoneCall.mock.calls[0][0]
    expect(arg.toNumber).toBe('+66899999999')
    expect(arg.fromNumber).toBe('+13192641997')
    expect(arg.vars.student_name).toBe('มะลิ')
    expect(arg.vars.call_mode).toBe('outbound_reminder')
    expect(arg.vars.call_goal).toContain('พี่เป็นฝ่ายโทรหาน้อง')
    expect((await cron(s)).body.dialed).toBe(0) // once per day
    expect(s.retell.createPhoneCall).toHaveBeenCalledTimes(1)
  })

  it('never dials a number other than TEST_PHONE_OWN, nor without consent', async () => {
    const s = setup({ ...live, DIALING_ENABLED: 'true' })
    await ready(s)
    const st = await s.store.read('u1')
    s.store.users.set('u1', { ...st, phone: '+66811111111' })
    expect((await cron(s)).body.dialed).toBe(0)
    s.store.users.set('u1', { ...st, consent: null })
    expect((await cron(s)).body.dialed).toBe(0)
    expect(s.retell.createPhoneCall).not.toHaveBeenCalled()
  })

  it('definite upstream refusal refunds; ambiguous failure keeps the charge', async () => {
    const refused = setup({ ...live, DIALING_ENABLED: 'true' }, { createPhoneCall: vi.fn(async () => { throw Object.assign(new Error('r'), { status: 400 }) }) })
    await ready(refused)
    await cron(refused)
    expect((await refused.store.read('u1')).lastPhoneStatus).toBe('failed')
    const amb = setup({ ...live, DIALING_ENABLED: 'true' }, { createPhoneCall: vi.fn(async () => { throw Object.assign(new Error('t'), { status: 503 }) }) })
    await ready(amb)
    await cron(amb)
    expect((await amb.store.read('u1')).lastPhoneStatus).toBe('unknown')
  })

  it('aborts if consent is revoked between reservation and the external call', async () => {
    const s = setup({ ...live, DIALING_ENABLED: 'true' })
    await ready(s)
    const orig = s.store.read.bind(s.store)
    s.store.read = async (uid) => { await s.call('revoke', { body: {} }); return orig(uid) }
    expect((await cron(s)).body.dialed).toBe(0)
    expect(s.retell.createPhoneCall).not.toHaveBeenCalled()
  })

  it('call_analyzed changes the schedule once, only for a call we issued', async () => {
    const s = setup({ ...live, DIALING_ENABLED: 'true' })
    await ready(s)
    await cron(s)
    const key = Object.keys((await s.store.read('u1')).reservations)[0]
    const hook = (cb) => s.call('webhook', { auth: false, headers: { 'x-retell-signature': 'sig' }, body: { event: 'call_analyzed', call: { metadata: { uid: 'u1', callKey: key, kind: 'phone' }, call_analysis: { custom_analysis_data: { callback_time: cb } } } } })
    await hook('17:00')
    expect((await s.store.read('u1')).schedule.time).toBe('17:00')
    await hook('10:00') // replay/other value must not rewind
    expect((await s.store.read('u1')).schedule.time).toBe('17:00')
    await s.call('webhook', { auth: false, headers: { 'x-retell-signature': 'sig' }, body: { event: 'call_analyzed', call: { metadata: { uid: 'u1', callKey: 'unknown' }, call_analysis: { custom_analysis_data: { callback_time: '09:30' } } } } })
    expect((await s.store.read('u1')).schedule.time).toBe('17:00')
  })

  it('stop (หยุดรับสาย) takes effect immediately', async () => {
    const s = setup({ ...live, DIALING_ENABLED: 'true' })
    await ready(s)
    await s.call('stop', { body: {} })
    expect((await cron(s)).body.dialed).toBe(0)
  })
})

describe('inbound phone call + tools', () => {
  const live = { RETELL_API_KEY: 'k', RETELL_AGENT_ID: 'a' }
  const sig = { 'x-retell-signature': 'sig' }
  const inbound = (call, from) => call('inbound', { auth: false, headers: sig, body: { event: 'call_inbound', call_inbound: { from_number: from, to_number: '+13192641997', agent_id: 'a' } } })
  const tool = (call, name, args, metadata) => call('tool', { auth: false, headers: sig, body: { name, args, call: { metadata } } })
  const TODAY = '2026-11-06'

  async function registered(extraEnv = {}) {
    const s = setup({ ...live, ...extraEnv })
    await s.call('consent', { body: adult })
    await s.call('phone', { body: { phone: OWN } })
    s.store.names.set('u1', 'มะลิ')
    s.store.osData.set('u1', { target: { faculty: 'วิศวะ' }, tasks: [{ id: 't1', text: 'อ่านฟิสิกส์', tag: 'A-Level', date: TODAY, done: false }] })
    return s
  }

  it('rejects an inbound webhook with a bad signature', async () => {
    const { call, retell } = await registered()
    retell.verifyWebhook.mockResolvedValueOnce(false)
    expect((await inbound(call, '+66899999999')).code).toBe(401)
  })

  it('recognises the caller by the saved phone, greets by name and hands over the plan + call metadata', async () => {
    const { call } = await registered()
    const r = await inbound(call, '+66899999999')
    expect(r.code).toBe(200)
    const ci = r.body.call_inbound
    expect(ci.metadata).toMatchObject({ uid: 'u1', kind: 'phone-in' })
    expect(ci.dynamic_variables.call_mode).toBe('inbound_support')
    expect(ci.dynamic_variables.student_name).toBe('มะลิ')
    expect(ci.dynamic_variables.student_context).toContain('อ่านฟิสิกส์')
    expect(ci.dynamic_variables.student_context).toContain(`วันนี้คือ ${TODAY}`)
  })

  it('an unknown number gets the register-your-phone script and no metadata', async () => {
    const { call } = await registered()
    const r = await inbound(call, '+66811111111')
    expect(r.body.call_inbound.dynamic_variables.call_mode).toBe('inbound_unknown')
    expect(r.body.call_inbound.metadata).toBeUndefined()
    expect(JSON.stringify(r.body)).not.toContain('อ่านฟิสิกส์')
  })

  it('does not serve a revoked or stopped account, and two accounts on one number are nobody', async () => {
    const s = await registered()
    await s.call('stop')
    expect((await inbound(s.call, '+66899999999')).body.call_inbound.dynamic_variables.call_mode).toBe('inbound_unknown')
    await s.call('resume')
    await s.call('consent', { uid: 'u2', body: adult })
    await s.call('phone', { uid: 'u2', body: { phone: OWN } })
    expect((await inbound(s.call, '+66899999999')).body.call_inbound.dynamic_variables.call_mode).toBe('inbound_unknown')
  })

  it('inbound call uses the web quota (daily cap stops a second call)', async () => {
    const { call, advance } = await registered({ VOICE_TRIAL_WEB_SECONDS_PER_DAY: '180' })
    expect((await inbound(call, '+66899999999')).body.call_inbound.metadata).toBeTruthy()
    advance(60000)
    expect((await inbound(call, '+66899999999')).body.call_inbound.dynamic_variables.call_mode).toBe('inbound_unknown')
  })

  it('tools: read today, add, move and complete tasks, and the OS store sees them', async () => {
    const { call, store } = await registered()
    const md = (await inbound(call, '+66899999999')).body.call_inbound.metadata
    const sched = await tool(call, 'get_schedule', {}, md)
    expect(sched.body.message).toContain('อ่านฟิสิกส์')
    const added = await tool(call, 'add_task', { text: 'ทบทวน TGAT', date: 'tomorrow' }, md)
    expect(added.body.changed).toBe(true)
    expect(store.osData.get('u1').tasks.map((x) => x.text)).toContain('ทบทวน TGAT')
    expect(store.voiceRev.get('u1')).toBeGreaterThan(0)
    await tool(call, 'move_tasks', { to_date: '+2' }, md)
    expect(store.osData.get('u1').tasks.find((x) => x.id === 't1').date).toBe('2026-11-08')
    await tool(call, 'complete_task', { text: 'ฟิสิกส์' }, md)
    expect(store.osData.get('u1').tasks.find((x) => x.id === 't1').done).toBe(true)
    expect((await tool(call, 'get_admission_news', {}, md)).body.message).toContain('mytcas.com')
  })

  it('tools refuse: bad signature, no metadata, unknown call, settled call, unknown tool', async () => {
    const { call, retell, store } = await registered()
    const md = (await inbound(call, '+66899999999')).body.call_inbound.metadata
    retell.verifyWebhook.mockResolvedValueOnce(false)
    expect((await tool(call, 'add_task', { text: 'x' }, md)).code).toBe(401)
    expect((await tool(call, 'add_task', { text: 'x' }, undefined)).body.message).toContain('ผูกเบอร์')
    expect((await tool(call, 'add_task', { text: 'x' }, { uid: 'u1', callKey: 'nope' })).body.message).toContain('หมดเวลา')
    expect((await tool(call, 'delete_all', {}, md)).body.message).toContain('ไม่รองรับ')
    await call('webhook', { auth: false, headers: sig, body: { event: 'call_ended', call: { duration_ms: 1000, metadata: md } } })
    expect((await tool(call, 'add_task', { text: 'x' }, md)).body.message).toContain('หมดเวลา')
    expect(store.osData.get('u1').tasks).toHaveLength(1)
  })

  it('tools never touch another account: uid comes from the call metadata of a live reservation only', async () => {
    const { call, store } = await registered()
    store.osData.set('u2', { tasks: [] })
    const md = (await inbound(call, '+66899999999')).body.call_inbound.metadata
    await tool(call, 'add_task', { text: 'x', uid: 'u2' }, md)
    expect(store.osData.get('u2').tasks).toHaveLength(0)
  })
})
