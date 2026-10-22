import { create } from 'zustand'
import { startFocus, checkInFocus, endFocus, abandonFocus } from '../services/focus'
import { useLeavesStore } from './useLeavesStore'

const IDLE = { status: 'idle', mode: null, plannedMin: null, startedAt: null, lastCheckInAt: null, verifiedMs: 0, result: null, witherReason: null }

// Client view of the one running focus session. The server owns time and credit; this store
// only remembers what it said and applies the finished result to the Leaves balance.
export const useFocusStore = create((set, get) => {
  const finish = (r, witherReason = null) => {
    useLeavesStore.getState().applyServer({ leaves: useLeavesStore.getState().leaves + Number(r.leaves ?? 0) })
    set({ status: r.withered ? 'withered' : 'done', result: r, witherReason: r.withered ? witherReason : null })
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
      set({ lastCheckInAt: r.lastCheckInAt, verifiedMs: r.verifiedMs })
      // A strict session whose check-in lapsed has withered on the server: settle it now so the
      // student sees the outcome instead of a tree that can never earn anything.
      if (r.withered) await get().abandon(null)
      return r
    },

    end: async () => finish(await endFocus()),

    // reason: 'hidden' (Strict, left the page) | 'away' (Flexible, away too long) — for the explanation.
    abandon: async (reason = null) => {
      if (get().status === 'idle') return null
      return finish(await abandonFocus(), reason)
    },

    reset: () => set({ ...IDLE }),
  }
})
