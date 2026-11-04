import { create } from 'zustand'
import { getDoc, getDocs } from 'firebase/firestore'
import { refs, cols, shapes } from '../lib/db'
import { canPlace, validateLayout } from '../room/placement'
import { resolveTap } from '../room/tapPlacement'
import { saveRoomLayout } from '../services/roomApi'
import { createRoomSync } from '../lib/roomSync'
import { emitGuide } from '../lib/guideEvents'
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
  selected: null, // item id armed for placing while decorating
  lastError: null, // why the last placement was refused (placement.js error code)

  hydrate: async (uid) => {
    const [catalogSnap, roomSnap] = await Promise.all([getDocs(cols.roomCatalog), getDoc(refs.room(uid))])
    const catalog = Object.fromEntries(catalogSnap.docs.map((d) => [d.id, d.data()]))
    const saved = roomSnap.exists() ? shapes.roomLayout(roomSnap.data()) : null
    // Items removed from the catalog cannot be drawn or validated; drop them so the room
    // stays editable (skipped when the catalog is empty, i.e. not seeded yet).
    const layout = saved && Object.keys(catalog).length > 0
      ? { ...saved, placed: saved.placed.filter((p) => catalog[p?.itemId]) }
      : saved
    set({ catalog, ...(layout ? { layout } : {}) })
  },

  reset: () => set({ layout: STARTER_LAYOUT, catalog: ROOM_CATALOG, decorating: false, selected: null, lastError: null }),
  setLayout: (layout) => set({ layout }),
  setDecorating: (decorating) => set({ decorating, ...(decorating ? {} : { selected: null, lastError: null }) }),
  selectItem: (selected) => set({ selected, lastError: null }),

  // `slot` is only for desk items (left | centre | right | back); their x/y are the desk's.
  place: (itemId, x, y, slot) => {
    const { layout, catalog } = get()
    const inventory = useLeavesStore.getState().inventory
    const candidate = { itemId, x, y, ...(slot !== undefined ? { slot } : {}) }
    if (!canPlace({ layout, catalog, inventory, itemId, x, y, slot })) {
      const { errors } = validateLayout({ layout: { ...layout, placed: [...layout.placed, candidate] }, catalog, inventory })
      // the candidate is the last placement: prefer the error that points at it
      const own = errors.find((e) => e.index === layout.placed.length) ?? errors[errors.length - 1]
      set({ lastError: own?.code ?? 'invalid' })
      return false
    }
    set({ layout: { ...layout, placed: [...layout.placed, candidate] }, lastError: null })
    roomSync.schedule()
    emitGuide('placed')
    return true
  },

  // A tap on the room while decorating: place the armed item there, or pick up what is under it.
  tapRoom: (x, y) => {
    const { layout, catalog, selected } = get()
    const action = resolveTap({ layout, catalog, selected, x, y })
    if (action.kind === 'place') return get().place(action.itemId, action.x, action.y, action.slot)
    if (action.kind === 'pickup') {
      get().pickUp(action.index)
      return true
    }
    if (action.reason) set({ lastError: action.reason })
    return false
  },

  pickUp: (index) => {
    const { layout, catalog } = get()
    if (index < 0 || index >= layout.placed.length) return
    const target = layout.placed[index]
    // Whatever stands on a desk goes with it (a slot item without its desk is invalid).
    const onDesk = catalog[target.itemId]?.kind === 'desk'
      ? (p) => catalog[p.itemId]?.deskSlot && p.x === target.x && p.y === target.y
      : () => false
    set({ layout: { ...layout, placed: layout.placed.filter((p, i) => i !== index && !onDesk(p)) } })
    roomSync.schedule()
  },
}))

export const roomSync = createRoomSync({
  save: (layout) => saveRoomLayout(layout),
  getLayout: () => useRoomStore.getState().layout,
})
