// Client for /api/voice/*. The server decides consent/quota/phone rules; this only
// carries the Firebase ID token and shapes dialog variables from existing app data.
import { auth } from '../firebase'
import { ERROR_TH } from '../constants/voiceCopy'

export class VoiceError extends Error {
  constructor(code) {
    super(code)
    this.code = code
    this.thai = ERROR_TH[code] || ERROR_TH.server_error
  }
}

export async function voiceApi(action, { method = 'POST', body } = {}) {
  const user = auth.currentUser
  if (!user) throw new VoiceError('unauthorized')
  let res
  try {
    const token = await user.getIdToken()
    res = await fetch(`/api/voice/${action}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    })
  } catch {
    throw new VoiceError('network')
  }
  let json = null
  try { json = await res.json() } catch { /* empty body */ }
  // No JSON back (404 HTML from `vite dev`, or API not deployed) = feature not available here.
  if (!json) throw new VoiceError('voice_unavailable')
  if (!res.ok || !json.ok) throw new VoiceError(json.error || 'server_error')
  return json
}

export const fetchStatus = () => voiceApi('status', { method: 'GET' })

/** Plain-text summary of the student's TCAS plan for the call script (max ~3 entries). */
export function buildStudyPlan(plans) {
  const list = (Array.isArray(plans) ? plans : [])
    .filter((p) => p && (p.programName || p.program))
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, 3)
  if (!list.length) return ''
  return list
    .map((p) => {
      const uni = p.universityName || p.university || ''
      const prog = p.programName || p.program || ''
      const round = p.round ? ` (รอบ ${p.round})` : ''
      return `${prog} ${uni}${round}`.replace(/\s+/g, ' ').trim()
    })
    .join('; ')
}
