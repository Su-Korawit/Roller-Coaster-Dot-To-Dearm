// Pure core of /api/track: turn one anonymous beacon into counter increments for a day document.
// No personal data: the visitor id is a random string that only ever decides "new visitor today";
// it is never stored. Everything stored is an aggregate counter.
const NAME = /^[a-z0-9][a-z0-9_-]{0,39}$/
const VID = /^[A-Za-z0-9_-]{8,64}$/

export const dayKey = (now = Date.now()) => new Date(now + 7 * 3600e3).toISOString().slice(0, 10)   // Bangkok day

const clean = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)

export function buildUpdate(body, now = Date.now()) {
  if (!body || typeof body !== 'object') return null
  if (!VID.test(String(body.vid ?? ''))) return null
  const inc = {}
  if (body.t === 'view') {
    inc.views = 1
    const p = clean(body.p || 'root') || 'root'
    inc[`paths.${p}`] = 1
    if (body.nv === true) inc.visitors = 1
    if (body.dev === 'mobile' || body.dev === 'desktop') inc[`devices.${body.dev}`] = 1
    const ref = clean(body.ref)
    if (ref) inc[`refs.${ref}`] = 1
  } else if (body.t === 'event') {
    if (!NAME.test(String(body.n ?? ''))) return null
    inc[`events.${body.n}`] = 1
  } else {
    return null
  }
  return { day: dayKey(now), inc }
}
