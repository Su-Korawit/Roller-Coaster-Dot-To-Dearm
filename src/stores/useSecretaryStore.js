import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { pushHistory, MAX_NOTES, MAX_NOTE } from '../os/secretaryLogic'
import { DEFAULT_SECRETARY_ID, SECRETARIES } from '../constants/secretaries'

// What the secretary did for the student (confirmed actions), newest first. Device-local on purpose:
// it is a small activity log, not data the student needs on another device.
export const useSecretaryStore = create(
  persist(
    (set) => ({
      ownerUid: null,
      history: [],   // { id, at (ms), text }
      secretaryId: DEFAULT_SECRETARY_ID,
      notes: [],     // { id, at, text } things the student told her ("เวลาว่าง: ..."), used in chat only
      adoptUser: (uid) => set((s) => (s.ownerUid === uid ? s : { ownerUid: uid, history: [], notes: [], secretaryId: DEFAULT_SECRETARY_ID })),
      setSecretary: (id) => set((s) => (SECRETARIES.some((x) => x.id === id) ? { secretaryId: id } : s)),
      addNote: (text) => set((s) => {
        const t = String(text).replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE)
        if (!t) return s
        return { notes: [{ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), text: t }, ...s.notes].slice(0, MAX_NOTES) }
      }),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      log: (text) => set((s) => ({ history: pushHistory(s.history, { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), text }) })),
      clear: () => set({ history: [] }),
    }),
    { name: 'rc-secretary' },
  ),
)
