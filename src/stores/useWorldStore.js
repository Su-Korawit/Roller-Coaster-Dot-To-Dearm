import { create } from 'zustand'

export const useWorldStore = create((set) => ({
  currentMapOwnerUid: null,
  mapObjects: [],

  setMapOwner:   (uid)     => set({ currentMapOwnerUid: uid }),
  setMapObjects: (objects) => set({ mapObjects: objects }),
}))
