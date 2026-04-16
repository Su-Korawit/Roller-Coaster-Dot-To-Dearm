import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSelectStore = create(
  persist(
    (set) => ({
      mbti: null,
      career: null,
      mastery: null,
      university: null,
      program: null,
      setMbti: (mbti) => set({ mbti }),
      setCareer: (career) => set({ career }),
      setMastery: (mastery) => set({ mastery }),
      setUniversity: (university) => set({ university }),
      setProgram: (program) => set({ program }),
      resetSelection: () =>
        set({
          mbti: null,
          career: null,
          mastery: null,
          university: null,
          program: null,
        }),
    }),
    {
      name: 'rc-select-store',
    },
  ),
)
