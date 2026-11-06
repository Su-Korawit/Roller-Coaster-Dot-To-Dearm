// api/voice/[action].js — Vercel entry for /api/voice/:action (status, consent, revoke, stop, resume,
// phone, schedule, web-call, webhook, dial-due). Logic lives in api/_voice/ (underscore = not a route).
import process from 'node:process'
import { createVoiceHandler } from '../_voice/handler.js'
import { createFirestoreStore, getAdmin } from '../_voice/store.js'
import * as retell from '../_voice/retell.js'

let _handler = null
async function getHandler() {
  if (_handler) return _handler
  const admin = await getAdmin()
  _handler = createVoiceHandler({ store: createFirestoreStore(admin), retell, env: process.env })
  return _handler
}

export default async function handler(req, res) {
  try {
    return await (await getHandler())(req, res)
  } catch (err) {
    // never leak internals or request content
    console.error('[voice] unhandled', err?.name || 'error')
    res.status(500).json({ ok: false, error: 'server_error' })
  }
}
