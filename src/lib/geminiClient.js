import { GoogleGenerativeAI } from '@google/generative-ai'

const DEFAULT_MODEL = 'gemini-2.5-flash'

// Returns a configured Gemini model instance. Pass opts to override model name
// or add systemInstruction — all other GoogleGenerativeAI options are supported.
export function getModel(opts = {}) {
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
  return genAI.getGenerativeModel({ model: DEFAULT_MODEL, ...opts })
}

// Strip markdown code fences and parse JSON. Throws on invalid JSON so callers
// can decide whether to fallback or rethrow.
export function parseJSONSafe(text) {
  const cleaned = text.replace(/```json|```/gi, '').trim()
  return JSON.parse(cleaned)
}
