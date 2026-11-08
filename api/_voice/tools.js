// api/_voice/tools.js — what the secretary can DO during a call. Pure: (name, args, os, now) in,
// a spoken-ready Thai message (and a new task list when something changed) out. No I/O.
// The handler (handler.js) verifies the call, loads users/{uid}.os, calls runTool and writes `tasks` back.
import { bkk } from './logic.js'
import { TCAS_CALENDAR, formatThaiRange } from '../../src/data/tcasCalendar.js'

export const TOOL_NAMES = ['get_schedule', 'get_admission_news', 'add_task', 'move_tasks', 'complete_task']
export const MAX_TASKS = 400
const DAY = 86400000
const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

// eslint-disable-next-line no-control-regex
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n)
const utc = (key) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d) }
const keyOf = (ms) => new Date(ms).toISOString().slice(0, 10)
export const shift = (key, days) => keyOf(utc(key) + days * DAY)
const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '')

function validKey(k) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k || '')) return false
  return keyOf(utc(k)) === k
}

/** 'today' | 'tomorrow' | 'วันนี้' | 'พรุ่งนี้' | 'มะรืน' | '+N' | 'YYYY-MM-DD' → 'YYYY-MM-DD' or null. */
export function resolveDate(input, today) {
  const s = String(input ?? '').trim().toLowerCase()
  if (!s || s === 'today' || s === 'วันนี้') return today
  if (s === 'tomorrow' || s === 'พรุ่งนี้') return shift(today, 1)
  if (s === 'มะรืน' || s === 'มะรืนนี้') return shift(today, 2)
  const plus = /^\+(\d{1,3})$/.exec(s)
  if (plus) return shift(today, Number(plus[1]))
  return validKey(s) ? s : null
}

const thaiDay = (key) => `${formatThaiRange(key)} (วัน${WEEKDAYS[new Date(utc(key)).getUTCDay()]})`
const tasksOf = (os) => (Array.isArray(os?.tasks) ? os.tasks : [])
const label = (t) => clean(t.text, 50)

function findOpen(tasks, query) {
  const q = norm(query)
  if (!q) return []
  return tasks.filter((t) => !t.done && (norm(t.text).includes(q) || q.includes(norm(t.text))))
}

function getSchedule(args, os, today) {
  const date = resolveDate(args.date, today)
  if (!date) return { message: 'วันที่ไม่ถูกต้อง ขอให้น้องบอกวันใหม่' }
  const day = tasksOf(os).filter((t) => t.date === date)
  const open = day.filter((t) => !t.done)
  const done = day.filter((t) => t.done)
  const head = date === today ? 'วันนี้' : thaiDay(date)
  if (day.length === 0) return { message: `${head}ยังไม่มีงานในแผน` }
  const parts = [`${head}มีงาน ${day.length} รายการ`]
  if (open.length) parts.push(`ยังไม่ทำ ${open.length}: ${open.slice(0, 6).map(label).join(', ')}`)
  if (done.length) parts.push(`ทำแล้ว ${done.length}: ${done.slice(0, 4).map(label).join(', ')}`)
  return { message: parts.join(' · ') }
}

function admissionItems() {
  const items = []
  for (const e of TCAS_CALENDAR.exams) items.push({ title: e.label, start: e.start, end: e.end || e.start })
  for (const r of TCAS_CALENDAR.rounds) {
    if (r.start) items.push({ title: `เปิดรับสมัครรอบ ${r.round} ${r.label}`, start: r.start, end: r.end || r.start, note: r.note })
    if (r.result) items.push({ title: `ประกาศผลรอบ ${r.round} ${r.label}`, start: r.result, end: r.result })
  }
  return items.sort((a, b) => a.start.localeCompare(b.start))
}

function getAdmissionNews(args, os, today) {
  const horizon = Math.min(Math.max(Number(args.days) || 60, 7), 365)
  const end = shift(today, horizon)
  const items = admissionItems()
  const now = items.filter((i) => i.start <= today && i.end >= today)
  const soon = items.filter((i) => i.start > today && i.start <= end).slice(0, 4)
  const line = (i) => {
    const left = Math.round((utc(i.start) - utc(today)) / DAY)
    return `${left > 0 ? `อีก ${left} วัน` : 'ตอนนี้'}: ${i.title} ${formatThaiRange(i.start, i.end)}${i.note ? ` (${i.note})` : ''}`
  }
  const lines = []
  if (now.length) lines.push(`กำลังเปิดอยู่ ${now.map(line).join(' | ')}`)
  if (soon.length) lines.push(`ที่กำลังจะมาถึง ${soon.map(line).join(' | ')}`)
  if (!lines.length) lines.push(`ใน ${horizon} วันนี้ยังไม่มีวันสำคัญของ TCAS ส่วนกลาง`)
  lines.push(`ข้อมูล ${TCAS_CALENDAR.label} ตรวจเมื่อ ${TCAS_CALENDAR.checkedAt} วันรับสมัครของแต่ละมหาวิทยาลัยต่างกัน ให้ตรวจที่ mytcas.com อีกครั้ง`)
  return { message: lines.join('\n') }
}

function addTask(args, os, today, now, newId) {
  const text = clean(args.text, 80)
  if (!text) return { message: 'ยังไม่ได้ยินชื่องาน ขอให้น้องพูดอีกครั้ง' }
  const date = resolveDate(args.date, today)
  if (!date || date < today) return { message: 'วันที่ไม่ถูกต้องหรือผ่านไปแล้ว ขอวันใหม่' }
  const tasks = tasksOf(os)
  if (tasks.length >= MAX_TASKS) return { message: 'งานในแผนเต็มแล้ว ให้น้องลบงานเก่าในแอป Habit ก่อน' }
  if (tasks.some((t) => !t.done && t.date === date && norm(t.text) === norm(text))) {
    return { message: `มีงาน "${text}" ในวันนั้นอยู่แล้ว` }
  }
  const task = { id: newId(now), text, tag: clean(args.tag, 20) || 'อื่นๆ', date, done: false, by: 'voice' }
  return { tasks: [...tasks, task], message: `เพิ่มงาน "${text}" ในวัน${date === today ? 'นี้' : ` ${thaiDay(date)}`} เรียบร้อยแล้ว` }
}

function moveTasks(args, os, today) {
  const to = resolveDate(args.to_date, today)
  if (!to || to < today || to > shift(today, 365)) return { message: 'วันที่จะเลื่อนไปไม่ถูกต้อง ขอวันใหม่' }
  const tasks = tasksOf(os)
  let ids
  if (clean(args.text, 80)) {
    const hits = findOpen(tasks, args.text)
    if (hits.length === 0) return { message: `ไม่พบงานที่ยังไม่ทำชื่อใกล้เคียง "${clean(args.text, 40)}"` }
    if (hits.length > 1) return { message: `มีหลายงานที่ตรงกัน: ${hits.slice(0, 4).map(label).join(', ')} ให้ถามน้องว่าหมายถึงงานไหน` }
    ids = new Set([hits[0].id])
  } else {
    const from = resolveDate(args.from_date, today)
    if (!from) return { message: 'วันที่เริ่มต้นไม่ถูกต้อง' }
    ids = new Set(tasks.filter((t) => t.date === from && !t.done).map((t) => t.id))
    if (ids.size === 0) return { message: 'ไม่มีงานที่ยังไม่ทำในวันนั้นให้เลื่อน' }
  }
  const next = tasks.map((t) => (ids.has(t.id) ? { ...t, date: to } : t))
  return { tasks: next, message: `เลื่อนงาน ${ids.size} รายการไปวัน${to === today ? 'นี้' : ` ${thaiDay(to)}`} แล้ว` }
}

function completeTask(args, os) {
  const hits = findOpen(tasksOf(os), args.text)
  if (hits.length === 0) return { message: `ไม่พบงานที่ยังไม่ทำชื่อใกล้เคียง "${clean(args.text, 40)}"` }
  if (hits.length > 1) return { message: `มีหลายงานที่ตรงกัน: ${hits.slice(0, 4).map(label).join(', ')} ให้ถามน้องว่าหมายถึงงานไหน` }
  const id = hits[0].id
  return { tasks: tasksOf(os).map((t) => (t.id === id ? { ...t, done: true } : t)), message: `ติ๊กว่าทำ "${label(hits[0])}" เสร็จแล้ว เก่งมาก` }
}

/**
 * @returns {{ message: string, tasks?: object[] }} `tasks` is present only when the list changed.
 */
export function runTool(name, args, { os, now, newId = (n) => `v${n.toString(36)}` }) {
  const a = args && typeof args === 'object' ? args : {}
  const today = bkk(now).dayKey
  switch (name) {
    case 'get_schedule': return getSchedule(a, os, today)
    case 'get_admission_news': return getAdmissionNews(a, os, today)
    case 'add_task': return addTask(a, os, today, now, newId)
    case 'move_tasks': return moveTasks(a, os, today)
    case 'complete_task': return completeTask(a, os)
    default: return { message: 'ฟังก์ชันนี้ยังไม่รองรับ' }
  }
}

// Definitions pushed to the Retell agent by scripts/setupRetellVoice.mjs (JSON Schema parameters).
export const TOOL_DEFS = [
  {
    name: 'get_schedule',
    description: 'ดูงานในแผนของน้องของวันที่ระบุ (ไม่ระบุ = วันนี้) ใช้เมื่อน้องถามว่าวันนี้ต้องทำอะไร หรือตารางงานวันไหน',
    parameters: { type: 'object', properties: { date: { type: 'string', description: 'today, tomorrow, +N หรือ YYYY-MM-DD' } } },
  },
  {
    name: 'get_admission_news',
    description: 'ดูข่าวและวันสำคัญของ TCAS ที่กำลังเปิดอยู่หรือกำลังจะมาถึง (สมัคร สอบ ประกาศผล) ใช้เมื่อน้องถามข่าวรับสมัคร',
    parameters: { type: 'object', properties: { days: { type: 'number', description: 'มองล่วงหน้ากี่วัน ค่าเริ่มต้น 60' } } },
  },
  {
    name: 'add_task',
    description: 'เพิ่มงานใหม่ลงแผนของน้อง เรียกหลังจากน้องยืนยันชื่องานและวันแล้วเท่านั้น',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'ชื่องานสั้นๆ' },
        date: { type: 'string', description: 'today, tomorrow, +N หรือ YYYY-MM-DD (ไม่ระบุ = วันนี้)' },
        tag: { type: 'string', description: 'หมวด เช่น TGAT, A-Level, อื่นๆ' },
      },
      required: ['text'],
    },
  },
  {
    name: 'move_tasks',
    description: 'เลื่อนงานที่ยังไม่ทำไปวันอื่น ระบุชื่องานเพื่อเลื่อนงานเดียว หรือไม่ระบุเพื่อเลื่อนงานค้างทั้งหมดของวันนั้น เรียกหลังจากน้องยืนยันวันใหม่แล้วเท่านั้น',
    parameters: {
      type: 'object',
      properties: {
        to_date: { type: 'string', description: 'วันใหม่ today, tomorrow, +N หรือ YYYY-MM-DD' },
        text: { type: 'string', description: 'ชื่องานที่จะเลื่อน (ไม่ระบุ = ทั้งวัน)' },
        from_date: { type: 'string', description: 'เลื่อนงานค้างของวันนี้ ค่าเริ่มต้น today' },
      },
      required: ['to_date'],
    },
  },
  {
    name: 'complete_task',
    description: 'ติ๊กงานที่น้องบอกว่าทำเสร็จแล้ว',
    parameters: { type: 'object', properties: { text: { type: 'string', description: 'ชื่องาน' } }, required: ['text'] },
  },
]
