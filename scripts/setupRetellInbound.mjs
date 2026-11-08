// Point the Retell phone number's inbound-call webhook at our server, so a call to the number is matched to the
// student's account (api/_voice/handler.js action "inbound").
//   node scripts/setupRetellInbound.mjs            dry run: shows the current and the wanted webhook URL
//   node scripts/setupRetellInbound.mjs --apply    sets inbound_webhook_url on the number
// Needs RETELL_API_KEY and RETELL_FROM_NUMBER (E.164) in .env (server-side only; the key is never printed).
// Webhook base: VOICE_PUBLIC_BASE (default https://ilovetcas.com). The agent and its functions are set by updateRetellPrompt.mjs.
import process from 'node:process'
import { readFileSync } from 'node:fs'

try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch { /* no .env: rely on the real environment */ }

const key = process.env.RETELL_API_KEY
const number = process.env.RETELL_FROM_NUMBER
const apply = process.argv.includes('--apply')
if (!key || !number) { console.error('RETELL_API_KEY and RETELL_FROM_NUMBER are required'); process.exit(1) }

const base = (process.env.VOICE_PUBLIC_BASE || 'https://ilovetcas.com').replace(/\/$/, '')
const want = `${base}/api/voice/inbound`
const api = async (method, path, body) => {
  const res = await fetch(`https://api.retellai.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 160)}`)
  return text ? JSON.parse(text) : null
}

const path = `/get-phone-number/${encodeURIComponent(number)}`
const cur = await api('GET', path)
console.log(`number ${cur.phone_number}: inbound agent ${cur.inbound_agent_id || '(none)'}, webhook ${cur.inbound_webhook_url || '(none)'}`)
console.log(`wanted webhook: ${want}`)
if (cur.inbound_webhook_url === want) { console.log('already set'); process.exit(0) }
if (!apply) { console.log('dry run only. add --apply to set it.'); process.exit(0) }
await api('PATCH', `/update-phone-number/${encodeURIComponent(number)}`, { inbound_webhook_url: want })
console.log('inbound webhook set')
