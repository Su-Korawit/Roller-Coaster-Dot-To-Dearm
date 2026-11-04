import { create } from 'zustand'

// Which sheet is open: 'focus' (setup), 'shop', 'warp', 'bag' or 'plan'. `payload` carries what a
// sheet should start with (the Plan's "อ่าน" opens 'focus' with { subjectKey, subjectLabel }).
// The desk seat in the room opens the focus sheet; the hotbar opens the others.
export const useRoomUiStore = create((set) => ({
  sheet: null,
  payload: null,
  open: (sheet, payload = null) => set({ sheet, payload }),
  close: () => set({ sheet: null, payload: null }),
}))
