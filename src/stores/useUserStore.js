import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

      setUser: (user) => set({ user }),
      setUserName: (userName) => set({ userName }),
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

      resetUser: () =>
        set({
          user: null,
          coins: 0,
          streak: 0,
          userName: '',
          portfolioData: defaultPortfolioData,
          journeys: defaultJourneys,
        }),
    }),
    {
      name: 'rc-user-store',
    },
  ),
)