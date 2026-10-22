import { create } from 'zustand'
import { getDoc, getDocs } from 'firebase/firestore'
import { refs, cols, shapes } from '../lib/db'
import { canPlace } from '../room/placement'
import { saveRoomLayout } from '../services/roomApi'
import { createRoomSync } from '../lib/roomSync'
import { useLeavesStore } from './useLeavesStore'
import { STARTER_LAYOUT } from '../room/defaultLayout'
import { ROOM_CATALOG } from '../data/roomCatalogSeed'

// The student's room: catalog rows (read-only), the saved layout, and decorate mode. Every
// layout change is checked with the same rules the server applies, then saved (debounced)
// through the saveRoomLayout callable.
export const useRoomStore = create((set, get) => ({
  // Guests (no account, no callables) and the moment before hydrate see the starter room.
  layout: STARTER_LAYOUT,
  catalog: ROOM_CATALOG,
  decorating: false,

  hydrate: async (uid) => {
    const [catalogSnap, roomSnap] = await Promise.all([getDocs(cols.roomCatalog), getDoc(refs.room(uid))])
    set({
      catalog: Object.fromEntries(catalogSnap.docs.map((d) => [d.id, d.data()])),
      ...(roomSnap.exists() ? { layout: shapes.roomLayout(roomSnap.data()) } : {}),
    })
  },

  setLayout: (layout) => set({ layout }),
  setDecorating: (decorating) => set({ decorating }),

  // `slot` is only for desk items (left | centre | right | back); their x/y are the desk's.
  place: (itemId, x, y, slot) => {
    const { layout, catalog } = get()
    const inventory = useLeavesStore.getState().inventory
    if (!canPlace({ layout, catalog, inventory, itemId, x, y, slot })) return false
    set({ layout: { ...layout, placed: [...layout.placed, { itemId, x, y, ...(slot !== undefined ? { slot } : {}) }] } })
    roomSync.schedule()
    return true
  },

  pickUp: (index) => {
    const { layout } = get()
    if (index < 0 || index >= layout.placed.length) return
    set({ layout: { ...layout, placed: layout.placed.filter((_, i) => i !== index) } })
    roomSync.schedule()
  },
}))

export const roomSync = createRoomSync({
  save: (layout) => saveRoomLayout(layout),
  getLayout: () => useRoomStore.getState().layout,
})
