import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useLifeStore } from './useLifeStore'

// The running reading session survives closing the app window or a reload (it only stores the start
// time — the countdown is computed from the clock). Finishing adds the minutes to the life log.
export const MIN_COUNTED_MIN = 1

export const useReadingTimerStore = create(
  persist(
    (set, get) => ({
      startedAt: null,   // epoch ms
      plannedMin: 25,

      start: (plannedMin) => set({ startedAt: Date.now(), plannedMin }),

      // Ends the session; returns the minutes counted (whole minutes, capped at the planned time + 5).
      finish: (now = Date.now()) => {
        const { startedAt, plannedMin } = get()
        if (startedAt == null) return 0
        const elapsed = Math.floor((now - startedAt) / 60000)
        const minutes = Math.min(elapsed, plannedMin + 5)
        set({ startedAt: null })
        if (minutes >= MIN_COUNTED_MIN) useLifeStore.getState().addReading(minutes)
        return minutes >= MIN_COUNTED_MIN ? minutes : 0
      },

      cancel: () => set({ startedAt: null }),
    }),
    { name: 'rc-reading-timer' },
  ),
)
