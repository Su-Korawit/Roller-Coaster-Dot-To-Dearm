import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nextStreak } from '../utils/streakCycle'

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
    (set, get) => ({
      user: null,
      coins: 0,
      fileBagUsageBytes: 0,
      focusXp: 0,        // lifetime Focus XP (Functions-owned; mirrored here for the HUD level badge)
      streak: 0,
      lastStreakDate: null, // 'YYYY-MM-DD' of the last day that counted toward the streak
      bestStreak: 0,
      aiUsage: null, // { date: 'YYYY-MM-DD', count } — daily AI-generation counter
      totalStacks: 0,   // incremented each time a task is marked complete
      userName: '',
      // Daily mood check-in
      feelingNotes: [],   // [{ date: 'YYYY-MM-DD', feel: 1-5 }]
      lastLoginDate: null, // 'YYYY-MM-DD' — guards one check-in per day
      portfolioData: defaultPortfolioData,
      journeys: defaultJourneys,
      activeMasteryBlockId: null,
      aiLanguage: 'Thai',
      controlMode: 'joystick',
      uiVisibility: { hotbar: true, shortcuts: true, newsButton: true, musicPill: true, contactFab: true },
      profilePhotoURL: null,

      setUser: (user) => set({ user }),
      setProfilePhotoURL: (url) => set({ profilePhotoURL: url }),
      setUserName: (userName) => set({ userName }),
      setActiveMasteryBlockId: (id) => set({ activeMasteryBlockId: id }),
      setAiLanguage: (lang) => set({ aiLanguage: lang }),
      setControlMode: (mode) => set({ controlMode: mode }),
      setUiVisibility: (key, value) =>
        set((state) => ({ uiVisibility: { ...state.uiVisibility, [key]: value } })),
      addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
      setCoins: (amount) => set({ coins: amount }),
      setFileBagUsageBytes: (n) => set({ fileBagUsageBytes: Number(n) || 0 }),
      setFocusXp: (n) => set({ focusXp: Math.max(0, Number(n) || 0) }),
      addFocusXp: (n) => set((s) => ({ focusXp: Math.max(0, s.focusXp + (Number(n) || 0)) })),
      setStreak: (streak) => set({ streak }),
      incrementStacks: () => set((state) => ({ totalStacks: state.totalStacks + 1 })),

      // Daily AI-generation usage counter (resets on a new date). Client-side
      // by design — the Gemini key is a client secret already, so the cap is a
      // fairness gate, not a security boundary. Cap = useEntitlementsStore's
      // aiDailyCap(). todayStr injectable for tests.
      aiUsesToday: (todayStr) => {
        const today = todayStr ?? new Date().toISOString().slice(0, 10)
        const usage = get().aiUsage
        return usage?.date === today ? usage.count : 0
      },
      trackAiUse: (todayStr) => {
        const today = todayStr ?? new Date().toISOString().slice(0, 10)
        const prev = get().aiUsage
        const count = (prev?.date === today ? prev.count : 0) + 1
        set({ aiUsage: { date: today, count } })
        return count
      },

      // Daily feel check-in (max once per day). Increments stacks and advances
      // the consecutive-day streak. Returns { streak, changed, broken } so the
      // check-in UI can show the Motivation screen. todayStr is injectable for
      // tests (same pattern as SchoolPanel's `today` prop).
      addDailyFeel: (level, todayStr) => {
        const today = todayStr ?? new Date().toISOString().slice(0, 10)
        const state = get()
        if (state.lastLoginDate === today) {
          return { streak: state.streak, changed: false, broken: false }
        }
        const result = nextStreak(state.lastStreakDate, today, state.streak)
        set({
          lastLoginDate: today,
          totalStacks: state.totalStacks + 1,
          feelingNotes: [...state.feelingNotes, { date: today, feel: level }],
          streak: result.streak,
          lastStreakDate: today,
          bestStreak: Math.max(state.bestStreak ?? 0, result.streak),
        })
        return result
      },

      // Returns true if the user has NOT yet checked in today
      needsDailyCheckIn: () => {
        const today = new Date().toISOString().slice(0, 10)
        return useUserStore.getState().lastLoginDate !== today
      },

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

      // Pushes a credit object into a journey item's progressNotes.
      // creditNote: { date, note, creditedFriend: { uid, displayName, photoURL }, taskTitle }
      addCreditToJourney: (journeyKey, journeyItemId, creditNote) =>
        set((state) => ({
          journeys: {
            ...state.journeys,
            [journeyKey]: (state.journeys[journeyKey] || []).map((item) =>
              item.id === journeyItemId
                ? { ...item, progressNotes: [...(item.progressNotes || []), creditNote] }
                : item,
            ),
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

      resetUser: () =>
        set({
          user: null,
          coins: 0,
          focusXp: 0,
          streak: 0,
          lastStreakDate: null,
          bestStreak: 0,
          aiUsage: null,
          totalStacks: 0,
          userName: '',
          feelingNotes: [],
          lastLoginDate: null,
          portfolioData: defaultPortfolioData,
          journeys: defaultJourneys,
          activeMasteryBlockId: null,
          aiLanguage: 'Thai',
          controlMode: 'joystick',
          uiVisibility: { hotbar: true, shortcuts: true, newsButton: true, musicPill: true, contactFab: true },
          profilePhotoURL: null,
        }),
    }),
    {
      name: 'rc-user-store',
    },
  ),
)