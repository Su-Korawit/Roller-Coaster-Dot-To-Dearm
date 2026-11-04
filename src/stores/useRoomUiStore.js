import { create } from 'zustand'
import { isVisiting } from './useVisitStore'
import { useFxStore } from './useFxStore'

const OWN_ROOM_ONLY = ['focus', 'shop', 'wardrobe'] // sheets that act on the student's own room and account

// Which sheet is open: 'focus' (setup), 'shop', 'wardrobe', 'history', 'warp', 'bag' or 'plan'. `payload` carries what a
// sheet should start with (the Plan's "อ่าน" opens 'focus' with { subjectKey, subjectLabel }).
// The desk seat in the room opens the focus sheet; the hotbar opens the others.
export const useRoomUiStore = create((set) => ({
  sheet: null,
  payload: null,
  open: (sheet, payload = null) => {
    if (OWN_ROOM_ONLY.includes(sheet) && isVisiting()) {
      useFxStore.getState().push({ kind: 'info', text: 'กำลังเยี่ยมห้องเพื่อน กลับห้องของฉันก่อน' })
      return
    }
    set({ sheet, payload })
  },
  close: () => set({ sheet: null, payload: null }),
}))
