import { create } from 'zustand'
import { startFocus, checkInFocus, endFocus, abandonFocus } from '../services/focus'
import { useLeavesStore } from './useLeavesStore'

const IDLE = { status: 'idle', mode: null, plannedMin: null, startedAt: null, lastCheckInAt: null, verifiedMs: 0, result: null, witherReason: null }

const isNoActive = (e) => /NO_ACTIVE_SESSION/.test(String(e?.message ?? '')) || e?.code === 'functions/failed-precondition'

// Client view of the one running focus session. The server owns time and credit; this store
// only remembers what it said and applies the finished result to the Leaves balance.
export const useFocusStore = create((set, get) => {
  const finish = (r, witherReason = null) => {
    useLeavesStore.getState().applyServer({ leaves: useLeavesStore.getState().leaves + Number(r.leaves ?? 0) })
    set({ status: r.withered ? 'withered' : 'done', result: r, witherReason: r.withered ? witherReason : null })
    return r
  }

  // Settles the session at most once at a time: `settling` is set synchronously, so an
  // end() racing an abandon() (or two auto-ends) never sends a second call. A failed call
  // goes back to running so it can be retried; a session the server no longer has is idle.
  const settle = async (call, witherReason) => {
    if (get().status !== 'running') return null
    set({ status: 'settling' })
    try {
      return finish(await call(), witherReason)
    } catch (e) {
      if (isNoActive(e)) {
        set({ ...IDLE })
        return null
      }
      set({ status: 'running' })
      throw e
    }
  }

  return {
    ...IDLE,

    start: async ({ mode, plannedMin } = {}) => {
      const r = await startFocus({ mode, plannedMin })
      set({ ...IDLE, status: 'running', mode: r.mode, plannedMin: r.plannedMin, startedAt: r.startedAt, lastCheckInAt: r.lastCheckInAt, verifiedMs: r.verifiedMs ?? 0 })
      // A resumed Strict session has already withered on the server: show the outcome.
      if (r.withered) await get().abandon('hidden')
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

    end: () => settle(endFocus, null),

    // reason: 'hidden' (Strict, left the page) | 'away' (Flexible, away too long) — for the explanation.
    abandon: (reason = null) => settle(abandonFocus, reason),

    reset: () => set({ ...IDLE }),
  }
})
