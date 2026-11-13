// Announcement text -> checklist items. Pure helpers shared by scripts/buildAnnouncementChecklists.mjs and the tests.
// Rule: emit only what the text clearly states (a labelled list, a fee with a number, a dated line). No guessing.

const NL = String.fromCharCode(10)
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', apos: "'" }

export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<li[^>]*>/gi, `${NL}• `)
    .replace(/<\/?(p|div|br|tr|h[1-6]|ul|ol|table|section|article|header|footer)[^>]*>/gi, NL)
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, e) => ENT[e.toLowerCase()] ?? m)
    .split(NL).map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim()).filter(Boolean).join(NL)
}

const BULLET = /^(?:[•●▪◦\-–]|\(?\d{1,2}[.)]|\d{1,2}\s)\s*/
const strip = (l) => l.replace(BULLET, '').trim()
const MAX_ITEM = 220

const SECTIONS = [
  { g: 'docs', title: 'เอกสารที่ต้องใช้สมัคร (ตามประกาศ)', head: /^(?:\d+[.)]\s*)?(?:เอกสาร|หลักฐาน)(?:ที่(?:ต้อง)?(?:ใช้|เตรียม)?)?(?:ใน(?:การ)?|ประกอบ(?:การ)?)?(?:สมัคร|รับสมัคร)?(?:[^\n]{0,30})?[:：]?$/ },
  { g: 'elig', title: 'คุณสมบัติผู้สมัคร (ตามประกาศ)', head: /^(?:\d+[.)]\s*)?คุณสมบัติ(?:ของ|เฉพาะ|ทั่วไป)?(?:ผู้(?:สมัคร|มีสิทธิ์?สมัคร))?[:：]?$/ },
]

// Labelled bullet list under a heading line: [{ head, lines }]
export function listsUnder(text, head) {
  const lines = String(text).split(NL)
  const out = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 60 || !head.test(lines[i].trim())) continue
    const items = []
    let j = i + 1
    for (; j < lines.length && items.length < 20; j++) {
      const l = lines[j]
      if (!BULLET.test(l)) { if (items.length === 0 && j - i <= 1 && l.length < 200) continue; break }
      const s = strip(l)
      if (s.length >= 4 && s.length <= MAX_ITEM) { if (!/(?:เช่น|ดังนี้|[:：])$/.test(s)) items.push(s) }
      else if (s.length > MAX_ITEM) break
    }
    if (items.length >= 2) out.push({ head: lines[i].trim(), lines: items })
  }
  return out
}

const THAI_MONTH = String.raw`(?:ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)`
const DATE_RE = new RegExp(String.raw`\d{1,2}\s*(?:-|–|ถึง|\s)?\s*(?:\d{1,2}\s*)?${THAI_MONTH}\s*(?:25\d{2}|\d{2})`)

// Application fee: exactly one distinct amount in lines that say "ค่าสมัคร ... N บาท".
export function findFee(text) {
  const amounts = new Set(); let line = ''
  for (const l of String(text).split(NL)) {
    const m = /ค่า(?:ธรรมเนียม)?(?:การ)?สมัคร[^\n]{0,80}?(\d[\d,]{1,6})\s*บาท/.exec(l)
    if (m && l.length < 300) { amounts.add(m[1].replace(/,/g, '')); line = l }
  }
  return amounts.size === 1 ? { amount: [...amounts][0], line: line.slice(0, MAX_ITEM) } : null
}

// Lines that state a date for applying / interviewing.
export function findDates(text) {
  const out = []
  for (const raw of String(text).split(NL)) {
    const l = raw.replace(/^(?:[a-z_]+\s+)+/, '').trim()   // icon names some sites print before the text (calendar_month ...)
    // only the TCAS70 cycle (B.E. 2569-2570), no table rows spanning several rounds, no long prose
    if (l.length > 140 || l.includes('|') || !DATE_RE.test(l) || !/(?:25(?:69|70)|(?<!\d)(?:69|70)(?!\d))/.test(l)) continue
    const kind = /สัมภาษณ์/.test(l) ? 'interview' : /รับสมัคร|สมัคร/.test(l) ? 'apply' : null
    if (kind && !out.some((o) => o.line === l)) out.push({ kind, line: l })
    if (out.length >= 6) break
  }
  return out
}

const hash = (s) => { let h = 5381; for (const c of s.normalize('NFC').replace(/\s+/g, '')) h = ((h * 33) ^ c.codePointAt(0)) >>> 0; return h.toString(36) }
// Stable item id: group + hash of the item's own text, so ticks survive a re-run while the wording is unchanged.
export const itemId = (g, text) => `${g}-${hash(text)}`

// One page's text -> { groups: [{ id, t, items: [{ id, t, ref }] }] } or null when nothing is clearly stated.
export function extractAnnouncement(text) {
  const groups = []
  for (const s of SECTIONS) {
    const found = listsUnder(text, s.head)
    if (!found.length) continue
    const best = found.sort((a, b) => b.lines.length - a.lines.length)[0]
    groups.push({ id: `x${s.g}`, t: s.title, items: best.lines.map((t) => ({ id: itemId(s.g, t), t, ref: best.head.slice(0, 60) })) })
  }
  const fee = findFee(text)
  const dates = findDates(text)
  const info = []
  if (fee) info.push({ id: itemId('fee', fee.amount), t: `ค่าสมัคร ${Number(fee.amount).toLocaleString('en-US')} บาท`, n: fee.line, ref: 'ค่าสมัคร' })
  for (const d of dates) info.push({ id: itemId(d.kind, d.line), t: d.line, ref: d.kind === 'interview' ? 'กำหนดสัมภาษณ์' : 'กำหนดรับสมัคร' })
  if (info.length) groups.push({ id: 'xinfo', t: 'ค่าสมัครและกำหนดการ (ตามประกาศ)', items: info })
  return groups.length ? { groups } : null
}

// Is a URL a document for specific projects (not a university portal / home page shared by hundreds)?
export function isSpecificPage(url, projectCount, maxShared = 40) {
  let u
  try { u = new URL(String(url).split(/\s+/)[0]) } catch { return false }
  const segs = u.pathname.split('/').filter(Boolean)
  const rootish = segs.length === 0 || (segs.length === 1 && /^(index|home|main)\.(php|html?|aspx?)$/i.test(segs[0])) || (u.hash && segs.length === 0)
  return !rootish && projectCount <= maxShared
}
