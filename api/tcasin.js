// api/tcasin.js — Vercel function: TCAS Starter (tcas.in.th) fallback when MyTCAS has no match.
//   GET /api/tcasin?mode=unis
//   GET /api/tcasin?uni=<name>.<id>
//   GET /api/tcasin?uni=<name>.<id>&fac=<name>.<id>
//   GET /api/tcasin?dept=<slug>.<id>
// Reads public HTML pages (no JSON API exists). Unofficial; may be previous-year data.
import { parseUniversities, parseFaculties, parseDepartments, parseDepartment, splitSlug } from './tcasinParse.js'

const BASE = 'https://tcas.in.th'
const TTL = 6 * 60 * 60 * 1000
const cache = new Map()   // path → { html, time }

async function page(path) {
  const hit = cache.get(path)
  if (hit && Date.now() - hit.time < TTL) return hit.html
  const res = await fetch(BASE + path, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; ILoveTCAS/1.0)', accept: 'text/html' } })
  if (!res.ok) throw new Error(`tcas.in.th ${res.status}`)
  const html = await res.text()
  if (cache.size > 300) cache.delete(cache.keys().next().value)
  cache.set(path, { html, time: Date.now() })
  return html
}

// A slug param must be "<name>.<id>" with no path characters, so only tcas.in.th paths can be built.
const slug = (v) => (typeof v === 'string' && v.length < 300 && !/[/?#\\]/.test(v) && splitSlug(v) ? encodeURIComponent(v) : null)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()
  const { mode, uni, fac, dept } = req.query
  const source = { source: 'tcas.in.th', official: false }
  try {
    if (dept) {
      const d = slug(dept)
      if (!d) return res.status(400).json({ error: 'bad dept' })
      return res.json({ ...source, ...parseDepartment(await page(`/department/${d}/`)), url: `${BASE}/department/${d}/` })
    }
    if (uni && fac) {
      const u = slug(uni)
      const f = slug(fac)
      if (!u || !f) return res.status(400).json({ error: 'bad slug' })
      return res.json({ ...source, departments: parseDepartments(await page(`/search/uni/${u}/fac/${f}/`)) })
    }
    if (uni) {
      const u = slug(uni)
      if (!u) return res.status(400).json({ error: 'bad uni' })
      return res.json({ ...source, faculties: parseFaculties(await page(`/search/uni/${u}/`)) })
    }
    if (mode === 'unis') return res.json({ ...source, universities: parseUniversities(await page('/search/category/?type=uni')) })
    return res.status(400).json({ error: 'mode=unis | uni | uni&fac | dept' })
  } catch (err) {
    console.error('[tcasin api]', err)
    return res.status(502).json({ error: 'ดึงข้อมูลจาก TCAS Starter ไม่สำเร็จ' })
  }
}
