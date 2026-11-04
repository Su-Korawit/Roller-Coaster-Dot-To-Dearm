import { create } from 'zustand'

// Where the player is and who else is there: the map being shown, whose presence room it
// belongs to, and the other players in it. (The Personal Map's decoration objects and edit
// mode were removed with the farm — ADR-0023; the room layout lives in useRoomStore.)
export const useWorldStore = create((set) => ({
  currentMapOwnerUid: null,
  currentMapKey:     null,
  remotePlayers:     {},

  setMapOwner: (uid) => set({ currentMapOwnerUid: uid }),
  setCurrentMapKey: (key) => set({ currentMapKey: key }),
  setRemotePlayers: (snapshot) => set({ remotePlayers: snapshot }),
}))
