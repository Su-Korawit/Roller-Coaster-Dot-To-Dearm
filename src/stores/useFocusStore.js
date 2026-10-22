import { create } from 'zustand'
import { startFocus, checkInFocus, endFocus, abandonFocus } from '../services/focus'
import { useLeavesStore } from './useLeavesStore'

const IDLE = { status: 'idle', mode: null, plannedMin: null, startedAt: null, lastCheckInAt: null, verifiedMs: 0, result: null }

// Client view of the one running focus session. The server owns time and credit; this store
// only remembers what it said and applies the finished result to the Leaves balance.
export const useFocusStore = create((set, get) => {
  const finish = (r) => {
    useLeavesStore.getState().applyServer({ leaves: useLeavesStore.getState().leaves + Number(r.leaves ?? 0) })
    set({ status: r.withered ? 'withered' : 'done', result: r })
    return r
  }

  return {
    ...IDLE,

    start: async ({ mode, plannedMin } = {}) => {
      const r = await startFocus({ mode, plannedMin })
      set({ ...IDLE, status: 'running', mode: r.mode, plannedMin: r.plannedMin, startedAt: r.startedAt, lastCheckInAt: r.lastCheckInAt, verifiedMs: r.verifiedMs ?? 0 })
      return r
    },

    checkIn: async () => {
      const r = await checkInFocus()
      set({ lastCheckInAt: r.lastCheckInAt, verifiedMs: r.verifiedMs, ...(r.withered ? { status: 'withered' } : {}) })
      return r
    },

    end: async () => finish(await endFocus()),

    abandon: async () => {
      if (get().status === 'idle') return null
      return finish(await abandonFocus())
    },

    reset: () => set({ ...IDLE }),
  }
})
