import { create } from 'zustand'

export const useWorldStore = create((set) => ({
  currentMapOwnerUid: null,
  mapObjects:        [],
  editMode:          false,
  selectedItemKey:   null,
  remotePlayers:     {},

  setMapOwner:   (uid)     => set({ currentMapOwnerUid: uid }),
  setMapObjects: (objects) => set({ mapObjects: objects }),

  setRemotePlayers: (snapshot) => set({ remotePlayers: snapshot }),

  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  setSelectedItem: (key) => set({ selectedItemKey: key }),

  addObject: (obj) =>
    set((s) => ({ mapObjects: [...s.mapObjects, obj] })),

  removeObject: (i) =>
    set((s) => ({ mapObjects: s.mapObjects.filter((_, idx) => idx !== i) })),

  moveObject: (i, x, y) =>
    set((s) => ({
      mapObjects: s.mapObjects.map((o, idx) => idx === i ? { ...o, x, y } : o),
    })),
}))
