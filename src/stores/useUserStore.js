import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      coins: 0,
      streak: 0,
      setUser: (user) => set({ user }),
      addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
      setStreak: (streak) => set({ streak }),
      resetUser: () => set({ user: null, coins: 0, streak: 0 }),
    }),
    {
      name: 'rc-user-store',
    },
  ),
)