import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

const defaultPortfolioData = {
  mastery: { title: 'Mastery', image: '', description: '', progress: 50 },
  career: { title: 'Career', image: '', description: '', progress: 0 },
  university: { title: 'University', image: '', description: '', progress: 0 },
}

const defaultJourneys = {
  mastery: [],
  career: [],
  university: [],
}

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      coins: 0,
      streak: 0,
      userName: '',
      portfolioData: defaultPortfolioData,
      journeys: defaultJourneys,
      activeMasteryBlockId: null,
      aiLanguage: 'Thai',

      setUser: (user) => set({ user }),
      setUserName: (userName) => set({ userName }),
      setActiveMasteryBlockId: (id) => set({ activeMasteryBlockId: id }),
      setAiLanguage: (lang) => set({ aiLanguage: lang }),
      addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
      setStreak: (streak) => set({ streak }),

      updatePortfolio: (key, data) =>
        set((state) => ({
          portfolioData: {
            ...state.portfolioData,
            [key]: { ...state.portfolioData[key], ...data },
          },
        })),

      setJourneys: (key, items) =>
        set((state) => ({
          journeys: { ...state.journeys, [key]: items },
        })),

      addJourneyItem: (key, item) =>
        set((state) => ({
          journeys: {
            ...state.journeys,
            [key]: [...(state.journeys[key] || []), item],
          },
        })),

      updateJourneyItem: (key, id, updates) =>
        set((state) => ({
          journeys: {
            ...state.journeys,
            [key]: state.journeys[key].map((item) =>
              item.id === id ? { ...item, ...updates } : item,
            ),
          },
        })),

      deleteJourneyItem: (key, id) =>
        set((state) => ({
          journeys: {
            ...state.journeys,
            [key]: state.journeys[key].filter((item) => item.id !== id),
          },
        })),

      // Append a formatted progress note + increase progress on a specific journey item
      updateJourneyProgress: (key, id, noteString, gainedPercent) =>
        set((state) => ({
          journeys: {
            ...state.journeys,
            [key]: state.journeys[key].map((item) => {
              if (item.id !== id) return item
              const newNotes = [...(item.progressNotes || []), noteString]
              const newProgress = Math.min(100, (item.progress || 0) + gainedPercent)
              return { ...item, progressNotes: newNotes, progress: newProgress }
            }),
          },
        })),

      // ── AI Actions ───────────────────────────────────────────────────────────

      // Generates a daily task for the pinned (active) mastery journey block
      // (caller is responsible for calling useTaskStore.getState().addTask)
      generateAIDailyTask: async () => {
        const state = useUserStore.getState()
        const blockId = state.activeMasteryBlockId
        if (!blockId) throw new Error('No active journey block pinned. Pin a block in your Profile first.')
        const block = state.journeys['mastery']?.find((b) => b.id === blockId)
        if (!block) throw new Error('Pinned journey block not found in mastery journeys.')

        const progressLogs = (block.progressNotes || []).join('\n') || 'No previous progress logged yet.'
        const { aiLanguage } = useUserStore.getState()
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
          linkedJourneyId: blockId,
          estimatedProgress: parsed.progress_reward ?? 10,
          completed: false,
          createdAt: Date.now(),
          updatedAt: null,
        }
      },

      // Evaluates a completed AI task with user reflection, appends to progressNotes
      evaluateAndCompleteTask: async (task, userReflection) => {
        const today = new Date().toLocaleDateString()
        const { aiLanguage } = useUserStore.getState()
        const prompt = `The user finished '${task.title}' and said: '${userReflection}'. Write a 1-sentence summary of this achievement starting with the date ${today}. Output strictly as JSON with no markdown: { "summary": "${today}: [achievement summary here]", "progress_inc": 10 }\nIMPORTANT: Generate the content ('title', 'description', 'summary', etc.) STRICTLY in ${aiLanguage} language.`

        // Fallback values
        let note = `${today}: ${task.title} - Completed with effort and dedication.`
        let gainedPercent = task.estimatedProgress ?? 10

        try {
          const text = await callGemini(prompt)
          const parsed = parseJSON(text)
          note = parsed.summary || note
          gainedPercent = typeof parsed.progress_inc === 'number' ? Math.min(20, Math.max(0, parsed.progress_inc)) : gainedPercent
        } catch (err) {
          console.error('AI evaluate parse error:', err)
          // fallback values already set above
        }

        if (task.linkedJourneyKey && task.linkedJourneyId) {
          useUserStore.getState().updateJourneyProgress(
            task.linkedJourneyKey,
            task.linkedJourneyId,
            note,
            gainedPercent,
          )
        }

        return { note, gainedPercent }
      },

      resetUser: () =>
        set({
          user: null,
          coins: 0,
          streak: 0,
          userName: '',
          portfolioData: defaultPortfolioData,
          journeys: defaultJourneys,
          activeMasteryBlockId: null,
          aiLanguage: 'Thai',
        }),
    }),
    {
      name: 'rc-user-store',
    },
  ),
)