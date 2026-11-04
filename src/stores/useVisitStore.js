import { create } from 'zustand'

// A visit to a friend's room (part 2): their saved layout, read-only. While `visiting` is set the room
// scene draws their room and every editing path (decorate, buy, wardrobe, focus) refuses. Nothing
// here is written anywhere: it only decides what the screen shows.
export const useVisitStore = create((set) => ({
  visiting: null, // { ownerUid, layout }
  begin: ({ ownerUid, layout }) => set({ visiting: { ownerUid, layout } }),
  end: () => set({ visiting: null }),
}))

export const isVisiting = () => useVisitStore.getState().visiting !== null
