// api/_voice/context.js — a short Thai snapshot of the student's plan for the call, built on the SERVER
// from users/{uid}.os (the Goal / Habit data the student synced), never from what the client sends.
// Only plan facts that the consent text already covers ("ชื่อและแผน TCAS"): goal, days to the first exam,
// today's tasks, plan progress, reading minutes. No personal notes, no free text typed into chat.
import { bkk } from './logic.js'

const DAY = 86400000
const parse = (key) => { const [y, m, d] = String(key).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1) }
// eslint-disable-next-line no-control-regex
const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n)

export function buildStudentContext(os, now) {
  if (!os || typeof os !== 'object') return ''
  const today = bkk(now).dayKey
  const target = os.target || {}
  const tasks = Array.isArray(os.tasks) ? os.tasks : []
  const lines = []

  const goal = [target.university, target.faculty, target.major].filter(Boolean).map((x) => clip(x, 60)).join(' / ')
  lines.push(`เป้าหมาย: ${goal || 'ยังไม่ได้ตั้งเป้าหมาย'}`)

  if (/^\d{4}-\d{2}-\d{2}$/.test(target.examDate || '')) {
    const left = Math.round((parse(target.examDate) - parse(today)) / DAY)
    lines.push(left >= 0 ? `เหลืออีก ${left} วันถึงวันสอบวิชาแรก` : 'วันสอบวิชาแรกผ่านไปแล้ว')
  }

  const subjects = (Array.isArray(os.scores) ? os.scores : []).map((s) => clip(s.subject, 30)).filter(Boolean).slice(0, 6)
  if (subjects.length) lines.push(`วิชาที่ต้องสอบ: ${subjects.join(', ')}`)

  const todays = tasks.filter((t) => t.date === today)
  const open = todays.filter((t) => !t.done)
  if (todays.length === 0) lines.push('วันนี้ไม่มีงานในแผน')
  else if (open.length === 0) lines.push(`วันนี้ทำครบทุกอย่างแล้ว (${todays.length} รายการ)`)
  else lines.push(`งานวันนี้ที่ยังไม่ทำ ${open.length} จาก ${todays.length}: ${open.slice(0, 4).map((t) => clip(t.text, 50)).join('; ')}`)

  const due = tasks.filter((t) => t.auto && t.date <= today)
  const planned = due.reduce((a, t) => a + (t.minutes || 0), 0)
  const done = due.filter((t) => t.done).reduce((a, t) => a + (t.minutes || 0), 0)
  if (planned) lines.push(`ทำตามแผนได้ ${Math.round((done / planned) * 100)}%`)

  const log = os.readLog && typeof os.readLog === 'object' ? os.readLog : {}
  let week = 0
  for (let i = 0; i < 7; i++) week += Number(log[new Date(parse(today) - i * DAY).toISOString().slice(0, 10)]) || 0
  lines.push(`อ่านหนังสือ 7 วันที่ผ่านมา ${week} นาที`)

  return lines.join('\n').slice(0, 900)
}
