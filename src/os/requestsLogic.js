// Report app logic (pure): validating a request and ranking the board.

export const KINDS = [
  { id: 'app', label: 'แอปใหม่' },
  { id: 'website', label: 'เว็บไซต์' },
]
export const MAX_TITLE = 80
export const MAX_REASON = 300
export const MAX_URL = 200
export const STATUS_LABEL = { new: 'รอพิจารณา', planned: 'กำลังทำ', done: 'เสร็จแล้ว' }

export const voteId = (requestId, uid) => `${requestId}_${uid}`

// Returns an error message (Thai) or null.
export function validateRequest({ kind, title, url = '', reason = '' }) {
  if (!KINDS.some((k) => k.id === kind)) return 'เลือกประเภทคำขอ'
  const t = String(title ?? '').trim()
  if (t.length < 3) return 'ชื่ออย่างน้อย 3 ตัวอักษร'
  if (t.length > MAX_TITLE) return `ชื่อยาวเกิน ${MAX_TITLE} ตัวอักษร`
  const u = String(url ?? '').trim()
  if (kind === 'website' && !u) return 'ใส่ลิงก์เว็บไซต์ที่อยากให้เพิ่ม'
  if (u && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(u)) return 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://'
  if (u.length > MAX_URL) return 'ลิงก์ยาวเกินไป'
  if (String(reason ?? '').length > MAX_REASON) return `เหตุผลยาวเกิน ${MAX_REASON} ตัวอักษร`
  return null
}

export function cleanRequest({ kind, title, url = '', reason = '' }) {
  return { kind, title: String(title).trim(), url: String(url).trim(), reason: String(reason).trim() }
}

// votes: [{ requestId, uid }] → { counts: Map(requestId → n), mine: Set(requestId) }
export function tallyVotes(votes, uid) {
  const counts = new Map()
  const mine = new Set()
  for (const v of votes) {
    counts.set(v.requestId, (counts.get(v.requestId) ?? 0) + 1)
    if (v.uid === uid) mine.add(v.requestId)
  }
  return { counts, mine }
}

const ms = (r) => r.createdAt?.toMillis?.() ?? (typeof r.createdAt === 'number' ? r.createdAt : Number.MAX_SAFE_INTEGER)

// Most votes first, then newest first (a request just sent has no server time yet → counts as newest).
export function rankRequests(requests, counts) {
  return [...requests].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || ms(b) - ms(a))
}
