import { create } from 'zustand'

// Which Study Room sheet is open: 'focus' (setup) or 'shop'. The desk seat in the room opens
// the focus sheet; the room layer's buttons open either.
export const useRoomUiStore = create((set) => ({
  sheet: null,
  open: (sheet) => set({ sheet }),
  close: () => set({ sheet: null }),
}))
