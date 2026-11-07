// Pure logic for the Secretary home: what the secretary asks about first, and her greeting.
import { daysUntil } from './studyPlan'
import { shiftKey } from './lifeLogic'

export const MAX_HISTORY = 30

export function greeting(hour) {
  if (hour < 5) return 'ดึกแล้วนะน้อง'
  if (hour < 12) return 'อรุณสวัสดิ์น้อง'
  if (hour < 17) return 'สวัสดีตอนบ่ายน้อง'
  if (hour < 21) return 'สวัสดีตอนเย็นน้อง'
  return 'ดึกแล้วนะน้อง'
}

// Things the secretary raises on her own, most important first. Each is
//   { id, text, confirm?: { label, action }, open?: appId }
// `action` is one of 'reschedule' (move today's open tasks to tomorrow) | 'plan' (build a study plan).
// Nothing happens until the student confirms; "open" just opens that app.
export function proactiveItems({ tasks = [], goals = [], scores = [], examDate, today, hour = 12 }) {
  const items = []
  const todays = tasks.filter((t) => t.date === today)
  const open = todays.filter((t) => !t.done)
  const hasPlan = tasks.some((t) => t.auto && t.date >= today)
  const left = daysUntil(examDate, today)

  if (goals.length === 0 && scores.length === 0) {
    items.push({ id: 'goal', text: 'น้องยังไม่ได้ตั้งเป้าหมาย พี่จะได้ดึงวิชาและวันสอบมาวางแผนให้ ไปตั้งที่ Goal กันไหม', open: 'goal' })
    return items
  }
  if (!hasPlan && scores.length > 0 && left != null && left >= 0) {
    items.push({ id: 'plan', text: 'ตอนนี้ยังไม่มีตารางอ่านหนังสือ ให้พี่สร้างตารางให้ถึงวันสอบไหม', confirm: { label: 'สร้างตารางให้เลย', action: 'plan' } })
  }
  if (open.length > 0) {
    items.push({
      id: 'today',
      text: hour >= 18
        ? `เย็นแล้วนะ วันนี้ยังเหลือ ${open.length} อย่าง ถ้าไม่ไหวจริงๆ ให้พี่เลื่อนไปพรุ่งนี้ได้`
        : `วันนี้ยังเหลือ ${open.length} อย่างที่ยังไม่ได้ทำ ทำเสร็จแล้วติ๊กไว้ให้พี่นะ`,
      confirm: { label: 'เลื่อนไปพรุ่งนี้', action: 'reschedule' },
    })
  } else if (todays.length > 0) {
    items.push({ id: 'done', text: 'วันนี้ทำครบแล้ว เก่งมาก พักผ่อนได้เลยน้อง' })
  }
  return items
}

// Move today's unfinished tasks to the next day. Returns the new task list (same objects if untouched).
export function rescheduleOpen(tasks, today) {
  const next = shiftKey(today, 1)
  return tasks.map((t) => (t.date === today && !t.done ? { ...t, date: next } : t))
}

// Newest first, capped.
export const pushHistory = (history, entry) => [entry, ...history].slice(0, MAX_HISTORY)
