import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_MODEL = 'gemini-2.5-flash'

async function callGemini(prompt) {
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

function parseJSON(text) {
  const cleaned = text.replace(/```json|```/gi, '').trim()
  return JSON.parse(cleaned)
}

// Generates a daily task for the active mastery journey block.
// Caller is responsible for calling useTaskStore.getState().addTask() with the result.
export async function generateAIDailyTask({ activeMasteryBlockId, journeys, aiLanguage }) {
  if (!activeMasteryBlockId)
    throw new Error('No active journey block pinned. Pin a block in your Profile first.')
  const block = journeys['mastery']?.find((b) => b.id === activeMasteryBlockId)
  if (!block)
    throw new Error('Pinned journey block not found in mastery journeys.')

  const progressLogs = (block.progressNotes || []).join('\n') || 'No previous progress logged yet.'
  const prompt = `Based on the Milestone '${block.title}' and these past progress logs:\n${progressLogs}\nWhat is the specific next small step the user should take today? Output strictly as JSON with no markdown: { "title": "Task name", "description": "Short action plan", "progress_reward": 10 }\nIMPORTANT: Generate the content ('title', 'description', 'summary', etc.) STRICTLY in ${aiLanguage} language.`

  const text = await callGemini(prompt)
  let parsed
  try {
    parsed = parseJSON(text)
  } catch {
    console.error('AI daily task parse error. Raw:', text)
    parsed = { title: `Work on: ${block.title}`, description: 'Continue making progress on this milestone.', progress_reward: 10 }
  }

  return {
    id: crypto.randomUUID(),
    title: parsed.title || `Work on: ${block.title}`,
    description: parsed.description || '',
    type: 'AI Mastery',
    timeMinutes: 45,
    rewardCoins: 15,
    isAIGenerated: true,
    linkedJourneyKey: 'mastery',
    linkedJourneyId: activeMasteryBlockId,
    estimatedProgress: parsed.progress_reward ?? 10,
    completed: false,
    createdAt: Date.now(),
    updatedAt: null,
  }
}

// Evaluates a completed AI task against the user's reflection.
// Returns { note, gainedPercent } — caller applies updateJourneyProgress.
export async function evaluateAndCompleteTask(task, userReflection, { aiLanguage }) {
  const today = new Date().toLocaleDateString()
  const prompt = `The user finished '${task.title}' and said: '${userReflection}'. Write a 1-sentence summary of this achievement starting with the date ${today}. Output strictly as JSON with no markdown: { "summary": "${today}: [achievement summary here]", "progress_inc": 10 }\nIMPORTANT: Generate the content ('title', 'description', 'summary', etc.) STRICTLY in ${aiLanguage} language.`

  let note = `${today}: ${task.title} - Completed with effort and dedication.`
  let gainedPercent = task.estimatedProgress ?? 10

  try {
    const text = await callGemini(prompt)
    const parsed = parseJSON(text)
    note = parsed.summary || note
    gainedPercent = typeof parsed.progress_inc === 'number'
      ? Math.min(20, Math.max(0, parsed.progress_inc))
      : gainedPercent
  } catch (err) {
    console.error('AI evaluate parse error:', err)
  }

  return { note, gainedPercent }
}
