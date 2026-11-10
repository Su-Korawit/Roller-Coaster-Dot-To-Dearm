// api/track.js — POST /api/track. Anonymous, aggregate-only analytics beacon (page views + app opens).
// Increments counters in analyticsDaily/{YYYY-MM-DD}; only the admin dashboard can read them.
import { buildUpdate } from './_track/logic.js'
import { getAdmin } from './_voice/store.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
    const upd = buildUpdate(body)
    if (!upd) return res.status(400).json({ ok: false })
    const admin = await getAdmin()
    const inc = admin.firestore.FieldValue.increment
    const data = {}
    for (const [k, v] of Object.entries(upd.inc)) data[k] = inc(v)
    // set+merge with dotted keys would create literal dotted fields; nest the objects instead.
    const nested = {}
    for (const [k, v] of Object.entries(data)) {
      const [a, b] = k.split('.')
      if (b === undefined) nested[a] = v
      else (nested[a] ||= {})[b] = v
    }
    await admin.firestore().collection('analyticsDaily').doc(upd.day).set(nested, { merge: true })
    return res.status(204).end()
  } catch (err) {
    console.error('[track]', err?.name || 'error')
    return res.status(500).json({ ok: false })
  }
}
