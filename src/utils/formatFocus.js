// Display helpers for the School World HUD. Pure.

const pad = (n) => String(n).padStart(2, '0')

// 83_000 -> "01:23", 3_725_000 -> "1:02:05"
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// Verified time for a summary line: 95 min -> "1 ชม. 35 นาที"
export function formatVerified(ms) {
  const mins = Math.floor(Math.max(0, ms) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h} ชม. ${m} นาที`
  if (h) return `${h} ชม.`
  return `${m} นาที`
}

// Time left in the leaderboard week.
export function formatWeekLeft(endsAtMs, now = Date.now()) {
  const left = endsAtMs - now
  if (!(left > 0)) return 'สรุปผลสัปดาห์นี้แล้ว'
  const days = Math.floor(left / 86_400_000)
  const hours = Math.floor((left % 86_400_000) / 3_600_000)
  if (days > 0) return `เหลืออีก ${days} วัน ${hours} ชม.`
  const mins = Math.floor((left % 3_600_000) / 60_000)
  return hours > 0 ? `เหลืออีก ${hours} ชม. ${mins} นาที` : `เหลืออีก ${mins} นาที`
}

// Server reply codes -> Thai copy.
export function focusMessage(result, error) {
  if (error) {
    if (error === 'NO_ACTIVE_SESSION') return 'ไม่พบเซสชันที่กำลังเรียน กดเริ่มใหม่ได้เลย'
    return 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง'
  }
  if (!result) return null
  if (result.tooSoon) return null
  if (result.lapsed) return 'ห่างหายไปนานเกินไป ช่วงนั้นเลยไม่นับ แต่เริ่มนับต่อจากตอนนี้ได้เลย'
  if (result.capped) return 'วันนี้ครบ 8 ชั่วโมงแล้ว พักผ่อนบ้างนะ'
  return null
}
