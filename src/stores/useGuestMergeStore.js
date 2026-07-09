import { create } from 'zustand'
import { applyGuestWork, clearGuestDirty } from '../services/guestMerge'

// Holds the guest-vs-cloud conflict sessionBootstrap surfaces after login
// (services/guestMerge.js decides; ADR-0012 merge policy). GuestMergeDialog
// renders while pendingConflict is true and calls one of the two resolutions.
export const useGuestMergeStore = create((set, get) => ({
  pendingConflict: false,
  pendingWork: null,

  offerGuestMerge: (work) => set({ pendingConflict: true, pendingWork: work }),

  // "เก็บงานใหม่เพิ่มเข้าไป" — append the guest work to the hydrated cloud
  // state; the armed sync writers persist the result.
  mergeGuestAppend: () => {
    const work = get().pendingWork
    if (work) applyGuestWork(work)
    clearGuestDirty()
    set({ pendingConflict: false, pendingWork: null })
  },

  // "ทิ้งงาน guest" — cloud state already replaced the stores during
  // hydration, so discarding is just clearing the marker and the offer.
  discardGuest: () => {
    clearGuestDirty()
    set({ pendingConflict: false, pendingWork: null })
  },
}))
