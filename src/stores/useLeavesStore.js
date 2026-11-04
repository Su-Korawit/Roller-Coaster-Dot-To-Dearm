import { create } from 'zustand'
import { getDoc } from 'firebase/firestore'
import { refs } from '../lib/db'
import { sanitizeAvatar } from '../room/avatar'

// Read-only mirror of users/{uid}.leaves / .roomInventory / .welcomePack (all Functions-owned).
// One read at sign-in; purchases and focus results patch it from the callable's response, so
// there is no listener and the client never writes these fields.
export const useLeavesStore = create((set) => ({
  leaves: 0,
  inventory: {},
  welcomePack: null,
  practiceDone: false, // the Guide's one-time practice gift was already paid
  focusBySubject: {}, // ms studied per exam subject (Functions-owned), for the Plan's goals
  avatar: { accessories: {}, outfitHue: null }, // users/{uid}.avatar (Functions-owned): worn accessories + outfit hue
  loaded: false,

  hydrate: async (uid) => {
    const snap = await getDoc(refs.user(uid))
    const d = snap.exists() ? snap.data() : {}
    set({ leaves: Number(d.leaves ?? 0), inventory: d.roomInventory ?? {}, welcomePack: d.welcomePack ?? null, practiceDone: d.practiceRewarded === true, focusBySubject: d.focusBySubject ?? {}, avatar: sanitizeAvatar(d.avatar), loaded: true })
  },

  applyServer: (patch) => set((s) => ({
    leaves: patch.leaves ?? s.leaves,
    inventory: patch.inventory ?? s.inventory,
    welcomePack: patch.welcomePack ?? s.welcomePack,
    practiceDone: patch.practiceDone ?? s.practiceDone,
    focusBySubject: patch.focusBySubject ?? s.focusBySubject,
    avatar: patch.avatar ? sanitizeAvatar(patch.avatar) : s.avatar,
  })),

  reset: () => set({ leaves: 0, inventory: {}, welcomePack: null, practiceDone: false, focusBySubject: {}, avatar: { accessories: {}, outfitHue: null }, loaded: false }),
}))
