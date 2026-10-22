import { create } from 'zustand'

// Which sheet is open: 'focus' (setup), 'shop', 'warp' or 'bag'. The desk seat in the room opens
// the focus sheet; the room layer's buttons open either.
export const useRoomUiStore = create((set) => ({
  sheet: null,
  open: (sheet) => set({ sheet }),
  close: () => set({ sheet: null }),
}))
