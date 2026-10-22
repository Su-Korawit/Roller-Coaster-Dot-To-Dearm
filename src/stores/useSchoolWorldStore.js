import { create } from 'zustand'

// UI/session state for the School Server (ADR 0018). Nothing here is persisted:
// the room is re-resolved each time the student enters, and the Focus session
// of record lives on the server (focusActive/{uid}).
const IDLE_FOCUS = {
  status: 'idle',          // 'idle' | 'active'
  startedAt: null,
  lastCheckInAt: null,
  verifiedMs: 0,
  xpThisSession: 0,
  temperament: null,       // 'NT' | 'NF' | 'SJ' | 'SP' | null — from the server, for the perk line
  lastResult: null,        // last server response (credited/lapsed/capped...) for HUD messages
  error: null,
  busy: false,
}

export const useSchoolWorldStore = create((set) => ({
  inHub: false,
  room: null,              // { kind: 'school' | 'commons', shard, ownerUid }
  enterStatus: 'idle',     // 'idle' | 'entering' | 'error'
  enterError: null,        // 'NO_SCHOOL' | 'ROOM_FULL' | 'FAILED'

  panel: null,             // { type: 'focus', seatId } | { type: 'board', id } | { type: 'leaderboard' } | null
  toolRequest: null,       // { route, n } — consumed by SchoolWorldLayer (needs the router)
  mapChangeRequest: null,  // { mapKey|null, spawnAt|null, n } — consumed by GameCanvas (owns the Phaser game)
  ambient: false,          // night-library ambience overlay
  entryMapKey: null,       // the game's entry map, set by GameCanvas; where leaving the hub returns to

  focus: IDLE_FOCUS,

  setEntering: () => set({ enterStatus: 'entering', enterError: null }),
  setEntered: (room) => set({ inHub: true, room, enterStatus: 'idle', enterError: null }),
  setEnterError: (code) => set({ enterStatus: 'error', enterError: code }),
  setLeft: () => set({ inHub: false, room: null, enterStatus: 'idle', enterError: null, panel: null }),

  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
  requestTool: (route) => set((s) => ({ toolRequest: { route, n: (s.toolRequest?.n ?? 0) + 1 } })),
  clearToolRequest: () => set({ toolRequest: null }),
  requestMapChange: (mapKey, opts = {}) => set((s) => ({ mapChangeRequest: { mapKey, spawnAt: opts.spawnAt ?? null, n: (s.mapChangeRequest?.n ?? 0) + 1 } })),
  clearMapChangeRequest: () => set({ mapChangeRequest: null }),
  setEntryMapKey: (key) => set({ entryMapKey: key }),
  toggleAmbient: () => set((s) => ({ ambient: !s.ambient })),

  setFocus: (patch) => set((s) => ({ focus: { ...s.focus, ...patch } })),
  resetFocus: () => set({ focus: IDLE_FOCUS }),
}))
