// api/_voice/retell.js — thin fetch wrapper over the Retell REST API (server-side only).
// The API key is read from process.env by the caller and never logged or returned.
import { verify } from 'retell-sdk'

const BASE = 'https://api.retellai.com'

async function post(path, apiKey, body, fetchImpl = fetch) {
  const res = await fetchImpl(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON error body */ }
  if (!res.ok) {
    // Only status + short message; never echo headers/body fields that may carry secrets.
    const err = new Error(`retell_${res.status}`)
    err.status = res.status
    err.detail = json?.message ? String(json.message).slice(0, 200) : undefined
    throw err
  }
  return json
}

export function createWebCall({ apiKey, agentId, vars, metadata, fetchImpl }) {
  // v3 (v2 was retired by Retell); same body. Response adds transport/ice_servers/expires_at.
  return post('/v3/create-web-call', apiKey, {
    agent_id: agentId,
    retell_llm_dynamic_variables: vars,
    metadata,
  }, fetchImpl)
}

export function createPhoneCall({ apiKey, agentId, fromNumber, toNumber, vars, metadata, idempotencyKey, fetchImpl }) {
  return post('/v2/create-phone-call', apiKey, {
    from_number: fromNumber,
    to_number: toNumber,
    override_agent_id: agentId,
    retell_llm_dynamic_variables: vars,
    metadata,
    // a retried request with the same key cannot dial twice
    ...(idempotencyKey ? { idempotency_key: String(idempotencyKey).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 255).padEnd(5, '0') } : {}),
  }, fetchImpl)
}

/** Webhook signature check (Retell: HMAC over JSON body with the API key). */
export async function verifyWebhook(body, apiKey, signature) {
  if (!apiKey || !signature) return false
  try {
    return await verify(JSON.stringify(body), apiKey, String(signature))
  } catch {
    return false
  }
}
