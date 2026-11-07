// Pure parsers for tcas.in.th (TCAS Starter by Dek-D). The site has no JSON API, so api/tcasin.js
// reads its public HTML pages. NOT official data: shown to students as a fallback when MyTCAS has
// no match, with a note that it may be last year's information.

const decode = (s) => { try { return decodeURIComponent(s) } catch { return s } }
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

// "<name>.<id>" → { name, id }; the name's hyphens are word breaks in department slugs.
export function splitSlug(slug) {
  const clean = decode(slug).replace(/\/+$/, '')
  const dot = clean.lastIndexOf('.')
  if (dot < 1) return null
  const id = clean.slice(dot + 1)
  if (!/^\d+$/.test(id)) return null
  return { id, name: clean.slice(0, dot) }
}

function uniqueBy(items, key) {
  const seen = new Set()
  return items.filter((i) => (seen.has(i[key]) ? false : seen.add(i[key])))
}

// /search/uni/<name>.<id>/  →  [{ id, slug, name }]
export function parseUniversities(html) {
  const out = []
  for (const m of html.matchAll(/href="\/search\/uni\/([^"/]+)\/?"/g)) {
    const s = splitSlug(m[1])
    if (s) out.push({ id: s.id, slug: decode(m[1]), name: s.name })
  }
  return uniqueBy(out, 'id')
}

// /search/uni/<uni>/fac/<name>.<id>/  →  [{ id, slug, name }]
export function parseFaculties(html) {
  const out = []
  for (const m of html.matchAll(/href="\/search\/uni\/[^"/]+\/fac\/([^"/]+)\/?"/g)) {
    const s = splitSlug(m[1])
    if (s) out.push({ id: s.id, slug: decode(m[1]), name: s.name })
  }
  return uniqueBy(out, 'id')
}

// /department/<slug>.<id>/  →  [{ id, slug, name }]  (name rebuilt from the slug)
export function parseDepartments(html) {
  const out = []
  for (const m of html.matchAll(/href="\/department\/([^"/]+)\/?"/g)) {
    const s = splitSlug(m[1])
    if (s) out.push({ id: s.id, slug: decode(m[1]), name: s.name.replace(/-/g, ' ') })
  }
  return uniqueBy(out, 'id')
}

// Round 3 (Admission) block of a department page → { title, seats, subjects: [{ label, weight }] }.
export function parseDepartment(html) {
  const t = text(html)
  const title = (html.match(/<title>([^<]*)<\/title>/) ?? [])[1]?.split('|')[0].trim() ?? null
  const start = t.indexOf('รอบ Admission')
  if (start < 0) return { title, seats: null, subjects: [] }
  const block = t.slice(start, start + 1500)
  const seats = Number((block.match(/จำนวนที่รับ\s*(\d+)\s*ที่นั่ง/) ?? [])[1]) || null
  const from = block.indexOf('วิชาที่กำหนดใช้')
  const to = block.indexOf('คะแนนขั้นต่ำ')
  const seg = from < 0 ? '' : block.slice(from + 'วิชาที่กำหนดใช้'.length, to > from ? to : from + 400).replace('สัดส่วน', ' ')
  // Each "<label> <n> %" pair: the label is whatever text sits between the previous % and this number.
  const subjects = []
  let last = 0
  for (const m of seg.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%/g)) {
    const label = seg.slice(last, m.index).trim()
    last = m.index + m[0].length
    const weight = Number(m[1])
    if (label && label.length <= 60 && weight > 0) subjects.push({ label, weight })
  }
  return { title, seats, subjects }
}
