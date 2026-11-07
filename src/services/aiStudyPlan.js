import { getModel, parseJSONSafe } from '../lib/geminiClient'
import { buildStudyPlan, planToTasks, daysUntil } from '../os/studyPlan'
import { todayKey } from '../os/lifeLogic'

// Builds the day-by-day plan to the exam day. The schedule itself is computed locally (so it always
// works and is predictable); the AI only adds a short Thai strategy note and one tip per subject,
// which are appended to the first task of each subject. If the AI call fails the plan is still returned.
export async function generateStudyPlan({ target, scores, hoursPerDay }, { today = todayKey(), ask = askGemini } = {}) {
  const days = buildStudyPlan({ today, examDate: target.examDate, scores, hoursPerDay })
  if (days.length === 0) return { tasks: [], summary: '', aiUsed: false, days: 0 }

  let summary = fallbackSummary(target, scores, today)
  let aiUsed = false
  try {
    const out = await ask({ target, scores, hoursPerDay, daysLeft: daysUntil(target.examDate, today) })
    if (out?.summary) { summary = String(out.summary).slice(0, 400); aiUsed = true }
    const tips = new Map((out?.tips ?? []).map((t) => [String(t.subject).trim(), String(t.tip).slice(0, 160)]))
    const seen = new Set()
    for (const d of days) {
      for (const t of d.tasks) {
        const tip = tips.get(t.subject)
        if (tip && !seen.has(t.subject)) { t.text = `${t.text} — ${tip}`; seen.add(t.subject) }
      }
    }
  } catch (e) {
    console.error('[aiStudyPlan] AI note failed, using the local plan only:', e)
  }
  return { tasks: planToTasks(days), summary, aiUsed, days: days.length }
}

function fallbackSummary(target, scores, today) {
  const left = daysUntil(target.examDate, today)
  const gaps = scores
    .filter((s) => s.mine != null && s.needed - s.mine > 0)
    .sort((a, b) => (b.needed - b.mine) - (a.needed - a.mine))
  const focus = gaps.length ? ` เน้น ${gaps[0].subject} ก่อน เพราะยังขาดมากที่สุด` : ''
  return `เหลืออีก ${left} วัน แบ่งเวลาอ่านทุกวันตามคะแนนที่ยังขาด${focus}`
}

async function askGemini({ target, scores, hoursPerDay, daysLeft }) {
  const list = scores
    .map((s) => `- ${s.subject}: ต้องใช้ ${s.needed}, ตอนนี้ ${s.mine ?? 'ยังไม่รู้'}`)
    .join('\n')
  const goal = [target.university, target.faculty, target.major].filter(Boolean).join(' / ') || 'ยังไม่ได้เลือก'
  const prompt = `นักเรียนไทยเตรียมสอบ TCAS รอบ 3 เป้าหมาย: ${goal}\nเหลือเวลา ${daysLeft} วัน อ่านวันละ ${hoursPerDay} ชั่วโมง\nคะแนนที่ต้องใช้:\n${list}\nเขียนกลยุทธ์สั้นๆ 2 ประโยค ให้กำลังใจ ไม่กดดัน (พี่เรียกตัวเองว่า "พี่" เรียกผู้ใช้ว่า "น้อง") และเคล็ดลับ 1 ข้อต่อวิชา เน้นเก็บคะแนนเท่าที่ใช้เข้าได้ ไม่ต้องอ่านเกินจำเป็น\nตอบเป็น JSON เท่านั้น ไม่มี markdown: { "summary": "...", "tips": [ { "subject": "ชื่อวิชาตามที่ให้", "tip": "..." } ] }`
  const result = await getModel().generateContent(prompt)
  return parseJSONSafe(result.response.text())
}
