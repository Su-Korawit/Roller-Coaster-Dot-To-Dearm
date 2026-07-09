import { create } from 'zustand'

// TODO: Wire pendingConflict to services/guestMerge.js (Claude Code Task 3.2).
// sessionBootstrap should call mergeGuestWork(uid) after login; when cloud has
// existing data, guestMerge sets pendingConflict=true for GuestMergeDialog.
export const useGuestMergeStore = create((set) => ({
  pendingConflict: false,
  setPendingConflict: (pendingConflict) => set({ pendingConflict }),
  // Stubs until guestMerge.js provides real merge/discard logic.
  mergeGuestAppend: () => set({ pendingConflict: false }),
  discardGuest: () => set({ pendingConflict: false }),
}))
