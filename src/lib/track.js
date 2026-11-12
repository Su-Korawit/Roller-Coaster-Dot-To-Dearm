// Anonymous first-party analytics. Nothing is sent until the visitor accepts (rc-analytics = 'yes').
// What is sent: a random visitor id (only used to count "new today"), the page path, the device
// class and app-open events. Aggregated server-side in /api/track; no name, email or uid.
const KEY = 'rc-analytics'      // 'yes' | 'no' | unset
const VID = 'rc-vid'
const DAY = 'rc-vid-day'

const ls = {
  get(k) { try { return localStorage.getItem(k) } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
}

export const getConsent = () => ls.get(KEY)
export function setConsent(yes) { ls.set(KEY, yes ? 'yes' : 'no') }
export const needsConsent = () => getConsent() == null

function visitorId() {
  let v = ls.get(VID)
  if (!v) {
    v = (crypto.randomUUID?.() ?? `${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '')
    ls.set(VID, v)
  }
  return v
}

function send(payload) {
  if (getConsent() !== 'yes') return
  const body = JSON.stringify({ vid: visitorId(), ...payload })
  try {
    if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) return
    fetch('/api/track', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
  } catch { /* analytics must never break the app */ }
}

export function trackView(path) {
  if (getConsent() !== 'yes') return
  const today = new Date().toISOString().slice(0, 10)
  const nv = ls.get(DAY) !== today
  if (nv) ls.set(DAY, today)
  let ref = ''
  try { ref = document.referrer ? new URL(document.referrer).hostname : '' } catch { /* bad referrer */ }
  if (ref === location.hostname) ref = ''
  send({ t: 'view', p: path, nv, dev: window.innerWidth < 768 ? 'mobile' : 'desktop', ref })
}

export const trackEvent = (name) => send({ t: 'event', n: String(name).toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40) })
