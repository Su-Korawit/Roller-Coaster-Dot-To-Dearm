import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { pushHistory } from '../os/secretaryLogic'

// What the secretary did for the student (confirmed actions), newest first. Device-local on purpose:
// it is a small activity log, not data the student needs on another device.
export const useSecretaryStore = create(
  persist(
    (set) => ({
      ownerUid: null,
      history: [],   // { id, at (ms), text }
      adoptUser: (uid) => set((s) => (s.ownerUid === uid ? s : { ownerUid: uid, history: [] })),
      log: (text) => set((s) => ({ history: pushHistory(s.history, { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), text }) })),
      clear: () => set({ history: [] }),
    }),
    { name: 'rc-secretary' },
  ),
)
