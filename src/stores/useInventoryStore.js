import { create } from 'zustand'
import { ITEMS } from '../data/ItemData.js'
import { addToSlots, removeFromSlots, countInSlots } from '../systems/inventoryLogic.js'

const HOTBAR_SIZE = 8
const STORAGE_SIZE = 30

export const useInventoryStore = create((set, get) => ({
  hotbar: Array(HOTBAR_SIZE).fill(null),
  storage: Array(STORAGE_SIZE).fill(null),
  gold: 100,

  countItem: (itemId) =>
    countInSlots(get().hotbar, itemId) + countInSlots(get().storage, itemId),

  hasItem: (itemId, count = 1) => get().countItem(itemId) >= count,

  // Fill the hotbar first, overflow into storage. Returns true if all placed.
  addItem: (itemId, count = 1) => {
    const item = ITEMS[itemId]
    if (!item) return false
    const stackMax = item.stackMax

    const h = addToSlots(get().hotbar, itemId, count, stackMax)
    let storage = get().storage
    let remaining = h.remaining
    if (remaining > 0) {
      const s = addToSlots(storage, itemId, remaining, stackMax)
      storage = s.slots
      remaining = s.remaining
    }
    set({ hotbar: h.slots, storage })
    return remaining === 0
  },

  removeItem: (itemId, count = 1) => {
    if (!get().hasItem(itemId, count)) return false
    const h = removeFromSlots(get().hotbar, itemId, count)
    let storage = get().storage
    if (h.removed < count) {
      const s = removeFromSlots(storage, itemId, count - h.removed)
      storage = s.slots
    }
    set({ hotbar: h.slots, storage })
    return true
  },

  addGold: (amount) => set((s) => ({ gold: s.gold + amount })),

  removeGold: (amount) => {
    if (get().gold < amount) return false
    set((s) => ({ gold: s.gold - amount }))
    return true
  },

  hasGold: (amount) => get().gold >= amount,
}))
