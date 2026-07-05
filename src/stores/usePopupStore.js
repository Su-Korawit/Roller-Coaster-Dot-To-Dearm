import { create } from 'zustand'

// Single active popup, app-wide. Opening a new popup replaces the current one,
// so two popups can never stack. Ephemeral — not persisted.
export const usePopupStore = create((set) => ({
  activePopup: null,
  payload: null,
  open: (id, payload = null) => set({ activePopup: id, payload }),
  close: () => set({ activePopup: null, payload: null }),
}))
