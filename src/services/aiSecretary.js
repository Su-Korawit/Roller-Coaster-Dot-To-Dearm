import { getModel } from '../lib/geminiClient'
import { daysUntil, planSuccess, thisWeekMinutes, formatMinutes } from '../os/studyPlan'
import { todayKey } from '../os/lifeLogic'
import { effectiveExamDate } from '../os/goalLogic'

// A short Thai snapshot of the student's situation, given to the AI so it can follow up on their plan.
export function buildSecretaryContext(life, today = todayKey(), { notes = [], deadlines = [] } = {}) {
  const left = daysUntil(effectiveExamDate(life.target, life.scores), today)
  const goal = [life.target.university, life.target.faculty, life.target.major].filter(Boolean).join(' / ') || 'ยังไม่ได้ตั้งเป้าหมาย'
  const todays = life.tasks.filter((t) => t.date === today)
  const open = todays.filter((t) => !t.done).map((t) => t.text)
  const gaps = life.scores
    .filter((s) => s.mine != null && s.needed - s.mine > 0)
    .map((s) => `${s.subject} ขาด ${s.needed - s.mine}`)
  const success = planSuccess(life.tasks, today)
  return [
    `เป้าหมาย: ${goal}`,
    left == null ? 'ยังไม่ได้ตั้งวันสอบ' : left >= 0 ? `เหลือ ${left} วันถึงวันสอบ` : 'ผ่านวันสอบแล้ว',
    `ทำตามแผนได้ ${success.percent}%`,
    `อ่านหนังสือ 7 วันที่ผ่านมา ${formatMinutes(thisWeekMinutes(life.readLog, today))}`,
    gaps.length ? `คะแนนที่ยังขาด: ${gaps.join(', ')}` : 'ยังไม่มีข้อมูลคะแนนที่ขาด',
    todays.length ? `งานวันนี้ที่ยังไม่ทำ: ${open.length ? open.join('; ') : 'ทำครบแล้ว'}` : 'วันนี้ไม่มีงานในแผน',
    deadlines.length ? `วันสำคัญที่ใกล้ถึง: ${deadlines.slice(0, 3).map((d) => `${d.title} (อีก ${d.left} วัน)`).join('; ')}` : '',
    notes.length ? `สิ่งที่น้องเคยบอกพี่: ${notes.slice(0, 8).map((n) => n.text).join(' | ')}` : '',
  ].filter(Boolean).join('\n')
}

export const systemFor = (name = 'พี่ใจดี') => SECRETARY_SYSTEM.replace('"พี่ใจดี"', `"${name}"`)

export const SECRETARY_SYSTEM = 'คุณคือ "พี่ใจดี" เลขา AI ของนักเรียนไทยที่เตรียมสอบ TCAS เรียกตัวเองว่า "พี่" เรียกผู้ใช้ว่า "น้อง" พูดอบอุ่น ให้กำลังใจ ไม่กดดัน ตอบสั้น 2-4 ประโยค ช่วยติดตามแผนอ่านหนังสือ เตือนงานที่ยังไม่ทำอย่างนุ่มนวล และแนะนำเฉพาะที่จำเป็นต่อการสอบเข้า ห้ามให้คำแนะนำทางการแพทย์หรือการเงิน'

// history: [{ role: 'user' | 'ai', text }] (oldest first, last few turns only).
export function buildSecretaryPrompt({ question, history = [], context, name }) {
  const past = history.slice(-6).map((m) => `${m.role === 'user' ? 'น้อง' : 'พี่'}: ${m.text}`).join('\n')
  return `${systemFor(name)}\n\nข้อมูลของน้องตอนนี้:\n${context}\n\n${past ? `บทสนทนาก่อนหน้า:\n${past}\n\n` : ''}น้อง: ${question}\nพี่:`
}

export async function askSecretary(input, { generate = defaultGenerate } = {}) {
  const text = (await generate(buildSecretaryPrompt(input))).trim()
  return text || 'ขอโทษนะน้อง พี่ตอบไม่ได้ตอนนี้ ลองถามใหม่อีกครั้ง'
}

async function defaultGenerate(prompt) {
  const result = await getModel().generateContent(prompt)
  return result.response.text()
}
