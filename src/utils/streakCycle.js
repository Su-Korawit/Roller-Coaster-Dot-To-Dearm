// Pure streak math + motivation copy — no imports, no I/O, no randomness
// (message pick is a function of the streak number so tests are exact).

export const MESSAGES = [
  'ความสม่ำเสมอชนะพรสวรรค์เสมอ 🔥',
  'วันนี้ก็มาแล้ว! ตัวเธอในอนาคตขอบคุณอยู่นะ',
  'ทีละวัน ทีละก้าว — เก่งขึ้นกว่าเมื่อวานแล้ว',
  'สตรีคยังไม่ขาด ความพยายามก็เหมือนกัน 💪',
  'คนที่ไปถึงฝัน คือคนที่มาทุกวันแบบเธอนี่แหละ',
]

const RESTART_MESSAGE = 'ไม่เป็นไรเลย เริ่มใหม่วันนี้ก็ยังทัน 🔥'

function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
}

export function nextStreak(lastStreakDate, todayStr, currentStreak) {
  if (lastStreakDate === todayStr) {
    return { streak: currentStreak, changed: false, broken: false }
  }
  if (lastStreakDate === shiftDate(todayStr, -1)) {
    return { streak: currentStreak + 1, changed: true, broken: false }
  }
  return { streak: 1, changed: true, broken: lastStreakDate != null && currentStreak > 1 }
}

export function cyclePosition(streak) {
  if (streak <= 0) return 0
  return ((streak - 1) % 5) + 1
}

export function motivationMessage(streak, broken) {
  if (broken) return RESTART_MESSAGE
  return MESSAGES[streak % MESSAGES.length]
}
