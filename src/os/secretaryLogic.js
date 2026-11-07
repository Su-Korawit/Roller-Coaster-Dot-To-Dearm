// Pure logic for the Secretary home: what the secretary asks about first, and her greeting.
import { daysUntil } from './studyPlan'
import { shiftKey } from './lifeLogic'

export const MAX_HISTORY = 30
export const MAX_NOTES = 30
export const MAX_NOTE = 140

// Things a good student-secretary asks about once, so she really knows the student. Each answer is kept as
// a note "<prefix>: <answer>" and is part of what she knows in chat (never sent to the voice call).
export const ASKS = [
  { id: 'free-time', prefix: 'เวลาว่าง', text: 'น้องสะดวกอ่านหนังสือช่วงไหนของวัน และวันไหนว่างที่สุด? พี่จะได้จัดตารางให้ตรงเวลา', placeholder: 'เช่น หลังเลิกเรียน 17:00-19:00, เสาร์อาทิตย์ว่างทั้งวัน' },
  { id: 'worry', prefix: 'วิชาที่กังวล', text: 'วิชาไหนที่น้องกังวลที่สุดตอนนี้? พี่จะได้เน้นให้', placeholder: 'เช่น ฟิสิกส์ กับ TGAT1' },
  { id: 'extra', prefix: 'ภาระอื่น', text: 'ช่วงนี้มีอะไรที่ต้องทำนอกจากอ่านหนังสือไหม เช่น สอบที่โรงเรียน กิจกรรม ติว งานพิเศษ?', placeholder: 'เช่น สอบกลางภาคปลายเดือน, ติวเลขวันอังคาร' },
  { id: 'support', prefix: 'อยากให้พี่ช่วย', text: 'น้องอยากให้พี่ช่วยเรื่องไหนเป็นพิเศษ? เช่น ตามงาน ให้กำลังใจ จัดตาราง', placeholder: 'เช่น ตามงานทุกเย็น' },
]

export const noteWith = (prefix) => (n) => n.text.startsWith(`${prefix}:`)

// The first ask the student has not answered yet (or null). One at a time, never a form.
export const nextAsk = (notes = []) => ASKS.find((a) => !notes.some(noteWith(a.prefix))) ?? null

// TCAS dates in the next `days` days, soonest first: [{ id, title, date, left }].
export function upcomingDeadlines(events = [], today, days = 14) {
  return events
    .map((e) => ({ id: e.id, title: e.title, date: e.date, left: daysUntil(e.date, today) }))
    .filter((e) => e.left != null && e.left >= 0 && e.left <= days)
    .sort((a, b) => a.left - b.left)
}

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
export function proactiveItems({ tasks = [], goals = [], scores = [], examDate, today, hour = 12, deadlines = [], notes = [] }) {
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
  // Dates that matter soon (registration, exam, results): she reminds without being asked.
  for (const d of deadlines.slice(0, 2)) {
    items.push({ id: `deadline-${d.id}`, text: d.left === 0 ? `วันนี้: ${d.title} อย่าลืมนะน้อง` : `อีก ${d.left} วัน: ${d.title} เตรียมตัวไว้นะน้อง`, open: 'calendar' })
  }
  // One question at a time to get to know the student.
  const ask = nextAsk(notes)
  if (ask) items.push({ id: `ask-${ask.id}`, text: ask.text, ask })
  return items
}

// Move today's unfinished tasks to the next day. Returns the new task list (same objects if untouched).
export function rescheduleOpen(tasks, today) {
  const next = shiftKey(today, 1)
  return tasks.map((t) => (t.date === today && !t.done ? { ...t, date: next } : t))
}

// Newest first, capped.
export const pushHistory = (history, entry) => [entry, ...history].slice(0, MAX_HISTORY)
