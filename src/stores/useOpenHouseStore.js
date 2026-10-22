import { create } from 'zustand'
import { fetchIndex, fetchBuilding } from '../services/openHouseClient'

// Session cache of the Open House files. A building is loading → ready | error; each request
// carries a ticket, so an older answer (a slow first try, a double open) can never overwrite a
// newer one or another building's data.
const IDLE_INDEX = { status: 'idle', data: null, error: null }
let ticket = 0
const inFlight = new Map() // building id -> promise of the current request

export const useOpenHouseStore = create((set, get) => ({
  index: IDLE_INDEX,
  buildings: {}, // { [id]: { status, data, error } }

  loadIndex: async () => {
    const { status } = get().index
    if (status === 'ready' || status === 'loading') return
    set({ index: { status: 'loading', data: null, error: null } })
    const r = await fetchIndex()
    set({ index: r.ok ? { status: 'ready', data: r.data, error: null } : { status: 'error', data: null, error: r.error } })
  },

  loadBuilding: (id) => {
    const cur = get().buildings[id]
    if (cur?.status === 'ready') return Promise.resolve()
    if (cur?.status === 'loading' && inFlight.has(id)) return inFlight.get(id)
    return get().retry(id)
  },

  // Always asks again (used by the retry button); the newest request wins.
  retry: (id) => {
    const mine = (ticket += 1)
    set((s) => ({ buildings: { ...s.buildings, [id]: { status: 'loading', data: null, error: null, ticket: mine } } }))
    const promise = fetchBuilding(id).then((r) => {
      if (get().buildings[id]?.ticket !== mine) return
      set((s) => ({
        buildings: {
          ...s.buildings,
          [id]: r.ok ? { status: 'ready', data: r.data, error: null, ticket: mine } : { status: 'error', data: null, error: r.error, ticket: mine },
        },
      }))
    }).finally(() => {
      if (inFlight.get(id) === promise) inFlight.delete(id)
    })
    inFlight.set(id, promise)
    return promise
  },

  reset: () => {
    inFlight.clear()
    set({ index: IDLE_INDEX, buildings: {} })
  },
}))
