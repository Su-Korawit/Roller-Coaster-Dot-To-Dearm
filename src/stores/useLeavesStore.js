import { create } from 'zustand'
import { getDoc } from 'firebase/firestore'
import { refs } from '../lib/db'

// Read-only mirror of users/{uid}.leaves / .roomInventory / .welcomePack (all Functions-owned).
// One read at sign-in; purchases and focus results patch it from the callable's response, so
// there is no listener and the client never writes these fields.
export const useLeavesStore = create((set) => ({
  leaves: 0,
  inventory: {},
  welcomePack: null,
  loaded: false,

  hydrate: async (uid) => {
    const snap = await getDoc(refs.user(uid))
    const d = snap.exists() ? snap.data() : {}
    set({ leaves: Number(d.leaves ?? 0), inventory: d.roomInventory ?? {}, welcomePack: d.welcomePack ?? null, loaded: true })
  },

  applyServer: (patch) => set((s) => ({
    leaves: patch.leaves ?? s.leaves,
    inventory: patch.inventory ?? s.inventory,
    welcomePack: patch.welcomePack ?? s.welcomePack,
  })),

  reset: () => set({ leaves: 0, inventory: {}, welcomePack: null, loaded: false }),
}))
