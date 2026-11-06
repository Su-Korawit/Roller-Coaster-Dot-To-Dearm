// Starts/stops a Retell Web Call in the browser. Real mode lazy-loads retell-client-js-sdk;
// mock mode (server has no Retell key) only simulates states so the UI can be developed.
import { voiceApi, VoiceError } from './voiceSecretary'

/**
 * @param {{student_name?:string, study_plan?:string}} vars
 * @param {(s:'connecting'|'talking'|'ended'|'error', info?:{mock?:boolean, code?:string})=>void} onState
 * @returns {Promise<{stop:()=>void, mock:boolean}>}
 */
export async function startVoiceCall(vars, onState) {
  onState('connecting')
  const out = await voiceApi('web-call', { body: vars }) // throws VoiceError (consent/quota/...)

  if (out.mock) {
    const t = setTimeout(() => onState('talking', { mock: true }), 800)
    return { mock: true, stop: () => { clearTimeout(t); onState('ended', { mock: true }) } }
  }

  // Ask for the mic first so a denial gives a clear message instead of a silent SDK failure.
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true })
    s.getTracks().forEach((tr) => tr.stop())
  } catch {
    throw new VoiceError('mic_denied')
  }

  const { RetellWebClient } = await import('retell-client-js-sdk')
  const client = new RetellWebClient()
  client.on('call_started', () => onState('talking'))
  client.on('call_ended', () => onState('ended'))
  client.on('error', () => { onState('error', { code: 'upstream_failed' }); try { client.stopCall() } catch { /* already stopped */ } })
  await client.startCall({
    accessToken: out.access_token,
    callId: out.call_id,
    ...(out.transport ? { transport: out.transport } : {}),
    ...(out.ice_servers ? { iceServers: out.ice_servers } : {}),
  })
  return { mock: false, stop: () => { try { client.stopCall() } catch { /* ignore */ } } }
}
