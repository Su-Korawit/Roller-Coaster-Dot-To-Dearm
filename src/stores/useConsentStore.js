import { create } from 'zustand'

// 'unknown' until the session bootstrap has looked at the user document,
// then 'ok' (consent on file for the current version) or 'needed'.
export const useConsentStore = create((set) => ({
  status: 'unknown',
  setStatus: (status) => set({ status }),
  reset: () => set({ status: 'unknown' }),
}))
