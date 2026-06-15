import { GoogleGenerativeAI } from '@google/generative-ai'

const FALLBACK =
  'ตอนนี้ผู้ช่วยร้านค้าขัดข้องชั่วคราว แต่ยังเลือกแพ็คเกจเหรียญด้านล่างและชำระผ่าน PromptPay ได้เลยครับ 🪙'

// Send a message to the shop assistant with prior turns as context. Returns a
// graceful fallback if the key is missing or the call fails. Mirrors the existing
// Gemini usage in useUserStore (model gemini-2.5-flash).
export async function sendShopChat(history, userMessage, systemPrompt) {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key) return FALLBACK
  try {
    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    })
    // Gemini requires history to begin with a 'user' turn — drop leading 'ai' turns.
    const firstUser = history.findIndex((t) => t.role === 'user')
    const trimmed = firstUser === -1 ? [] : history.slice(firstUser)
    const chat = model.startChat({
      history: trimmed.map((t) => ({
        role: t.role === 'ai' ? 'model' : 'user',
        parts: [{ text: t.text }],
      })),
    })
    const result = await chat.sendMessage(userMessage)
    return result.response.text().trim() || FALLBACK
  } catch (err) {
    console.error('[shopAi] sendShopChat failed:', err)
    return FALLBACK
  }
}
