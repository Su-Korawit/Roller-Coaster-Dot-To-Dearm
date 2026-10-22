import { create } from 'zustand'
import { defaultHotbar, normalizeHotbar, swapSlots, placeFromBag } from '../lib/hotbarRules'

const KEY = 'rc-hotbar'

export function readLocalHotbar() {
  try {
    return normalizeHotbar(JSON.parse(localStorage.getItem(KEY)))
  } catch {
    return defaultHotbar()
  }
}

// The 7 hotbar item ids. Accounts persist them to users/{uid}.hotbar (see syncManager);
// the localStorage copy is the guest store and a cache for everyone.
export const useHotbarStore = create((set, get) => ({
  slots: readLocalHotbar(),
  swap: (from, to) => set({ slots: swapSlots(get().slots, from, to) }),
  assign: (itemId, slot) => set({ slots: placeFromBag(get().slots, itemId, slot) }),
  setSlots: (slots) => set({ slots: normalizeHotbar(slots) }),
  reset: () => set({ slots: defaultHotbar() }),
}))

useHotbarStore.subscribe((s, prev) => {
  if (s.slots === prev.slots) return
  try {
    localStorage.setItem(KEY, JSON.stringify(s.slots))
  } catch { /* storage unavailable: the bar still works for this visit */ }
})
