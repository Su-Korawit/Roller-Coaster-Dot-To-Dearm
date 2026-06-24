import { create } from 'zustand'

const objectsFor = (objectsByMap, key) => (key && objectsByMap[key]) || []

export const useWorldStore = create((set) => ({
  currentMapOwnerUid: null,
  currentMapKey:     null,
  objectsByMap:      {},
  mapObjects:        [],   // derived = objectsByMap[currentMapKey] ?? []
  editMode:          false,
  selectedItemKey:   null,
  remotePlayers:     {},

  setMapOwner: (uid) => set({ currentMapOwnerUid: uid }),

  setCurrentMapKey: (key) =>
    set((s) => ({ currentMapKey: key, mapObjects: objectsFor(s.objectsByMap, key) })),

  setObjectsByMap: (obj) =>
    set((s) => ({ objectsByMap: obj, mapObjects: objectsFor(obj, s.currentMapKey) })),

  // Replace the current map's objects.
  setMapObjects: (objects) =>
    set((s) => {
      const next = { ...s.objectsByMap, [s.currentMapKey]: objects }
      return { objectsByMap: next, mapObjects: objects }
    }),

  setRemotePlayers: (snapshot) => set({ remotePlayers: snapshot }),

  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  setSelectedItem: (key) => set({ selectedItemKey: key }),

  addObject: (obj) =>
    set((s) => {
      const arr = [...objectsFor(s.objectsByMap, s.currentMapKey), obj]
      return { objectsByMap: { ...s.objectsByMap, [s.currentMapKey]: arr }, mapObjects: arr }
    }),

  removeObject: (i) =>
    set((s) => {
      const arr = objectsFor(s.objectsByMap, s.currentMapKey).filter((_, idx) => idx !== i)
      return { objectsByMap: { ...s.objectsByMap, [s.currentMapKey]: arr }, mapObjects: arr }
    }),

  moveObject: (i, x, y) =>
    set((s) => {
      const arr = objectsFor(s.objectsByMap, s.currentMapKey).map((o, idx) => idx === i ? { ...o, x, y } : o)
      return { objectsByMap: { ...s.objectsByMap, [s.currentMapKey]: arr }, mapObjects: arr }
    }),
}))
