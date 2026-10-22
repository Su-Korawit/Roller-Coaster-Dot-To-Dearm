import { create } from 'zustand'
import { BUILDING_BY_ID } from '../constants/openHouseBuildings'

// UI state of the campus: which faculty popup is open, which door the player stands at (the
// "เข้าตึก" action), and the walk command. The game scene is not imported here: GameCanvas
// registers `walker` (tile -> game event) so components can ask the avatar to walk.
export const useOpenHouseUiStore = create((set, get) => ({
  openBuildingId: null,
  doorBuildingId: null,
  nearDirectory: false,
  directoryOpen: false,
  walker: null,

  // Unknown ids are ignored (a stale deep link or a typo never opens an empty popup).
  openBuilding: (id) => { if (BUILDING_BY_ID[id]) set({ openBuildingId: id, directoryOpen: false }) },
  closeBuilding: () => set({ openBuildingId: null }),

  setDoor: (id) => set({ doorBuildingId: BUILDING_BY_ID[id] ? id : null }),
  // Walking out of a door also closes that building's popup.
  clearDoor: (id) => {
    const s = get()
    set({
      doorBuildingId: s.doorBuildingId === id ? null : s.doorBuildingId,
      openBuildingId: s.openBuildingId === id ? null : s.openBuildingId,
    })
  },

  setNearDirectory: (near) => set({ nearDirectory: !!near }),
  openDirectory: () => set({ directoryOpen: true, openBuildingId: null }),
  closeDirectory: () => set({ directoryOpen: false }),

  setWalker: (fn) => set({ walker: typeof fn === 'function' ? fn : null }),
  walkTo: (tx, ty) => { const w = get().walker; if (w) w(tx, ty); return !!w },

  reset: () => set({ openBuildingId: null, doorBuildingId: null, nearDirectory: false, directoryOpen: false }),
}))
