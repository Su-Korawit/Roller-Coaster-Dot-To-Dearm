// ============================================================================
// aiJourney.js — บริการเรียก Gemini เพื่อสร้าง "Dual Mastery Journey" roadmap
// ----------------------------------------------------------------------------
// สรุปการเปลี่ยนแปลง (Candidate 4 — aiJourney service):
//   เดิม: ProfilePanel.jsx ฝังโค้ดเรียก Gemini ~48 บรรทัดไว้ในตัว component
//         (สร้าง prompt, new GoogleGenerativeAI, parse JSON, validate) ปนกับ
//         logic UI → ทดสอบยาก และถ้า SDK เปลี่ยนต้องแก้ใน component
//   ใหม่: ย้าย logic ฝั่ง AI ทั้งหมดมาที่ generateJourney() ที่นี่ ส่วน component
//         เหลือแค่จัดการ state UI (isGenerating, alert) และเติม id ให้แต่ละ step
//   หมายเหตุ: คงรุ่นโมเดล 'gemini-3-flash-preview' ตามเดิม (ไม่รวมกับ aiTasks
//         ที่ใช้ 'gemini-2.5-flash') ตามที่ตกลงไว้
//   โยน Error('AI_BAD_FORMAT') เมื่อผลลัพธ์ไม่ใช่ JSON array เพื่อให้ผู้เรียก
//         แยกข้อความแจ้งเตือน "รูปแบบผิด" กับ "เชื่อมต่อไม่ได้" ได้เหมือนเดิม
// ============================================================================
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Generate a 5-step dual-track (mastery + TCAS) journey via Gemini.
 *
 * @param {object} profile
 * @param {string} [profile.career]      dream career name
 * @param {string} [profile.mbti]        MBTI type
 * @param {string} [profile.mastery]     current mastery level name
 * @param {string} [profile.university]  current university name
 * @param {string} [profile.program]     current program name
 * @param {string} profile.aiLanguage    language to generate content in
 * @returns {Promise<Array<{title: string, desc: string}>>}
 * @throws {Error} 'AI_BAD_FORMAT' on non-array output; underlying error otherwise
 */
export async function generateJourney({ career, mbti, mastery, university, program, aiLanguage }) {
  const desiredCareer = career || 'a chosen career'
  const mbtiType = mbti || 'unknown'
  const masteryLevel = mastery || 'general skills'
  const universityName = university || ''
  const programName = program || ''
  const currentSituation =
    [universityName, programName].filter(Boolean).join(' — ') || 'a student exploring career paths'

  const prompt = `Act as an expert career and skills counselor. The user is currently in this situation: ${currentSituation}, their dream career is ${desiredCareer}, their current skill mastery level is ${masteryLevel}, and their MBTI personality type is ${mbtiType}. In addition to skill mastery, the user is also preparing for university admission under the Thai system (TCAS / TGAT / TPAT, often referred to as TCAT). You MUST design a dual-track roadmap that integrates BOTH: 1) Mastery development (career skills, portfolio, real-world capability) and 2) University admission preparation (especially TCAS Round 3: exam-based track requiring TGAT/TPAT and academic subjects). Generate a personalized 5-step "Dual Mastery Journey" roadmap. REQUIREMENTS: Each step MUST clearly explain HOW to practice and master essential career skills (hands-on methods, project-based learning, feedback loops, etc.) AND ALSO include HOW to prepare for TCAS Round 3 (study system, exam strategies, subject prioritization, past papers, score optimization). Explicitly reference the structure of TCAS (Portfolio vs Round 3) and how the user should balance both paths. Tailor everything to the user's ${mbtiType} learning style and adapt to the user's current ${masteryLevel} level. Focus on actionable systems, not theory. Output strictly as a JSON array of objects with 'title' and 'description' keys. Do not include markdown formatting. IMPORTANT: Generate the content STRICTLY in ${aiLanguage} language.`

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })
  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const cleaned = text.replace(/```json|```/gi, '').trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('Gemini JSON parse error:', parseErr, '\nRaw response:', text)
    throw new Error('AI_BAD_FORMAT')
  }

  if (!Array.isArray(parsed)) throw new Error('AI_BAD_FORMAT')

  return parsed.map((step) => ({ title: step.title || 'Step', desc: step.description || '' }))
}
