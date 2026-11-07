import { getModel, parseJSONSafe } from '../lib/geminiClient'

// "ยังไม่รู้จะเรียนอะไร" path of the Goal app: the AI narrows the field down to a few real programmes
// that fit the student's interests and strongest subjects. It only suggests names; the Goal app then
// looks them up in MyTCAS (official data) before anything becomes a goal.

export const MAX_SUGGESTIONS = 5

export function buildAdvisorPrompt({ interests = [], subjects = [], note = '', daysLeft = null }) {
  return `คุณคือ "พี่ใจดี" ที่ปรึกษาเลือกคณะให้นักเรียนไทยที่เตรียมสอบ TCAS รอบ 3 และยังไม่รู้ว่าจะเรียนอะไร${daysLeft != null ? ` เหลือเวลาอีก ${daysLeft} วัน ต้องตัดสินใจเร็ว` : ''}
ความสนใจ: ${interests.join(', ') || 'ไม่ได้ระบุ'}
วิชาที่ถนัด: ${subjects.join(', ') || 'ไม่ได้ระบุ'}
เพิ่มเติม: ${note || '-'}
เสนอคณะ/สาขาที่มีจริงในไทย ${MAX_SUGGESTIONS} ตัวเลือก เรียงจากเหมาะที่สุด ใช้ชื่อมหาวิทยาลัยและคณะแบบทางการ เลือกที่เปิดรับรอบ 3 และเข้าได้จริงสำหรับคนเวลาไม่มาก พร้อมเหตุผลสั้นๆ 1 ประโยค (พี่เรียกผู้ใช้ว่า "น้อง")
ตอบเป็น JSON เท่านั้น ไม่มี markdown: { "suggestions": [ { "university": "...", "faculty": "...", "program": "ชื่อสาขา", "reason": "..." } ] }`
}

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

export function parseSuggestions(raw) {
  const list = Array.isArray(raw?.suggestions) ? raw.suggestions : []
  return list
    .map((s) => ({ university: clean(s.university, 80), faculty: clean(s.faculty, 80), program: clean(s.program, 100), reason: clean(s.reason, 200) }))
    .filter((s) => s.university && (s.faculty || s.program))
    .slice(0, MAX_SUGGESTIONS)
}

export async function suggestPrograms(input, { ask = askGemini } = {}) {
  return parseSuggestions(await ask(buildAdvisorPrompt(input)))
}

async function askGemini(prompt) {
  const result = await getModel().generateContent(prompt)
  return parseJSONSafe(result.response.text())
}
