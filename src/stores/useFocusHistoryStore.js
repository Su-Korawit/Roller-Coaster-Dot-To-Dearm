import { create } from 'zustand'
import { getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { cols } from '../lib/db'
import { shapeSession, sortSessions, isTreeSession, HISTORY_LIMIT } from '../room/focusHistory'

let ticket = 0

// The student's finished focus sessions (read-only: the focus functions write them). The ordered
// query needs the uid + endedAt index; until it is deployed the read falls back to an unordered query
// sorted here, so the sheet works either way.
export const useFocusHistoryStore = create((set, get) => ({
  status: 'idle', // idle | loading | ready | error
  sessions: [],

  load: async (uid) => {
    if (!uid) return
    const mine = (ticket += 1)
    set({ status: 'loading' })
    try {
      let snap
      try {
        snap = await getDocs(query(cols.focusSessions, where('uid', '==', uid), orderBy('endedAt', 'desc'), limit(HISTORY_LIMIT)))
      } catch (e) {
        if (e?.code !== 'failed-precondition') throw e
        snap = await getDocs(query(cols.focusSessions, where('uid', '==', uid), limit(200)))
      }
      if (mine !== ticket) return
      const sessions = sortSessions(snap.docs.filter((d) => isTreeSession(d.data())).map((d) => shapeSession(d.id, d.data()))).slice(0, HISTORY_LIMIT)
      set({ status: 'ready', sessions })
    } catch {
      if (mine === ticket) set({ status: 'error' })
    }
  },

  prepend: (session) => set({ sessions: [session, ...get().sessions.filter((s) => s.id !== session.id)].slice(0, HISTORY_LIMIT) }),

  reset: () => {
    ticket += 1
    set({ status: 'idle', sessions: [] })
  },
}))
