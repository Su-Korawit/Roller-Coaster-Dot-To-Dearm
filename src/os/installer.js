import { create } from 'zustand'
import { useOsStore } from '../stores/useOsStore'

// "Download then install" for Store apps. The apps ship with the site, so the percentage is a
// simulated download; the app only lands on Home once it reaches 100%. Lives at module level so
// closing the Store window mid-download does not lose the install.
export const INSTALL_TICK_MS = 120
const DONE_HOLD_MS = 350

// Fast at the start, slower near the end (like a real download). Pure, for tests.
export function nextProgress(p) {
  const step = p < 60 ? 9 : p < 90 ? 5 : 3
  return Math.min(100, p + step)
}

const timers = new Map()

export const useInstallStore = create((set, get) => ({
  progress: {},   // { [appId]: 0..100 } while downloading

  start: (id) => {
    if (get().progress[id] != null || useOsStore.getState().installed.includes(id)) return
    set((s) => ({ progress: { ...s.progress, [id]: 0 } }))
    const timer = setInterval(() => {
      const now = nextProgress(get().progress[id] ?? 0)
      set((s) => ({ progress: { ...s.progress, [id]: now } }))
      if (now < 100) return
      clearInterval(timer)
      timers.delete(id)
      useOsStore.getState().installApp(id)
      setTimeout(() => set((s) => {
        const { [id]: _done, ...rest } = s.progress
        return { progress: rest }
      }), DONE_HOLD_MS)
    }, INSTALL_TICK_MS)
    timers.set(id, timer)
  },
}))
