import { create } from 'zustand'
import { tileKey, occupiedTiles, canPlant, isReady, rollYield } from '../systems/farmLogic.js'

const plotsFor = (plotsByMap, key) => (key && plotsByMap[key]) || {}

export const useFarmStore = create((set, get) => ({
  plotsByMap: {},
  currentMapKey: null,
  plots: {}, // derived = plotsByMap[currentMapKey] ?? {}

  setCurrentMapKey: (key) =>
    set((s) => ({ currentMapKey: key, plots: plotsFor(s.plotsByMap, key) })),

  setPlotsByMap: (obj) =>
    set((s) => ({ plotsByMap: obj, plots: plotsFor(obj, s.currentMapKey) })),

  plant: (x, y, plantId) => {
    const s = get()
    const key = s.currentMapKey
    if (!key) return false
    const plots = plotsFor(s.plotsByMap, key)
    if (!canPlant(plots, x, y, plantId).ok) return false

    const anchorKey = tileKey(x, y)
    const next = { ...plots, [anchorKey]: { plantId, plantedAt: Date.now(), tileX: x, tileY: y } }
    for (const t of occupiedTiles(x, y, plantId)) {
      const k = tileKey(t.x, t.y)
      if (k !== anchorKey) next[k] = { anchorKey }
    }
    set({ plotsByMap: { ...s.plotsByMap, [key]: next }, plots: next })
    return true
  },

  harvest: (x, y, rng = Math.random) => {
    const s = get()
    const key = s.currentMapKey
    if (!key) return null
    const plots = plotsFor(s.plotsByMap, key)
    const plot = plots[tileKey(x, y)]
    if (!plot || plot.anchorKey) return null // empty or a non-anchor sub-tile
    if (!isReady(plot.plantedAt, plot.plantId, Date.now())) return null

    const count = rollYield(plot.plantId, rng)
    const next = { ...plots }
    for (const t of occupiedTiles(x, y, plot.plantId)) delete next[tileKey(t.x, t.y)]
    set({ plotsByMap: { ...s.plotsByMap, [key]: next }, plots: next })
    return { itemId: plot.plantId, count }
  },
}))
