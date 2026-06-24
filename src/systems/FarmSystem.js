import { PLANTS } from '../data/PlantData.js'

export const getOccupiedTiles = (tileX, tileY, plantId) => {
  const plant = PLANTS[plantId]
  const tiles = []
  for (let dy = 0; dy < plant.size.h; dy++) {
    for (let dx = 0; dx < plant.size.w; dx++) {
      tiles.push({ x: tileX + dx, y: tileY + dy })
    }
  }
  return tiles
}

export class FarmSystem {
  constructor() {
    this.plots = new Map()
    this.listeners = []
  }

  canPlant(tileX, tileY, plantId) {
    if (!PLANTS[plantId]) {
      return { ok: false, reason: 'ไม่รู้จักพืชนี้' }
    }

    const tiles = getOccupiedTiles(tileX, tileY, plantId)
    for (const tile of tiles) {
      const tileKey = `${tile.x}_${tile.y}`
      if (this.plots.has(tileKey)) {
        return { ok: false, reason: 'มีพืชอยู่แล้ว' }
      }
    }

    return { ok: true }
  }

  plant(tileX, tileY, plantId) {
    const canPlantResult = this.canPlant(tileX, tileY, plantId)
    if (!canPlantResult.ok) return false

    const plant = PLANTS[plantId]
    const now = Date.now()
    const anchorKey = `${tileX}_${tileY}`

    const plotState = {
      plantId,
      stage: 0,
      plantedAt: now,
      stageStartAt: now,
      lastWateredAt: null,
      isReady: false,
      tileX,
      tileY,
    }

    this.plots.set(anchorKey, plotState)

    if (plant.size.w > 1 || plant.size.h > 1) {
      const tiles = getOccupiedTiles(tileX, tileY, plantId)
      for (const tile of tiles) {
        const tileKey = `${tile.x}_${tile.y}`
        if (tileKey !== anchorKey) {
          this.plots.set(tileKey, { isAnchor: false, anchorKey })
        }
      }
    }

    this._emit('planted', { tileX, tileY, plantId })
    return true
  }

  update(deltaMs) {
    const changedPlots = []

    for (const [key, plot] of this.plots) {
      if (plot.isAnchor === false) continue
      if (plot.isReady) continue

      const plant = PLANTS[plot.plantId]
      if (!plant) continue

      const now = Date.now()
      const elapsed = (now - plot.stageStartAt) / 1000
      const growTime = plant.growTime[plot.stage]

      if (growTime && elapsed >= growTime) {
        plot.stage++
        plot.stageStartAt = now

        if (plot.stage >= 3) {
          plot.stage = 3
          plot.isReady = true
        }

        this._emit('stageChanged', {
          tileX: plot.tileX,
          tileY: plot.tileY,
          stage: plot.stage,
          isReady: plot.isReady,
        })

        changedPlots.push({
          tileX: plot.tileX,
          tileY: plot.tileY,
          stage: plot.stage,
          isReady: plot.isReady,
        })
      }
    }

    return changedPlots
  }

  harvest(tileX, tileY) {
    const key = `${tileX}_${tileY}`
    const plot = this.plots.get(key)

    if (!plot || plot.isAnchor === false) return null
    if (!plot.isReady) return null

    const plantId = plot.plantId
    const plant = PLANTS[plantId]
    const count = Math.floor(Math.random() * (plant.yieldMax - plant.yieldMin + 1)) + plant.yieldMin

    this.plots.delete(key)

    if (plant.size.w > 1 || plant.size.h > 1) {
      const tiles = getOccupiedTiles(tileX, tileY, plantId)
      for (const tile of tiles) {
        const tileKey = `${tile.x}_${tile.y}`
        if (tileKey !== key) {
          this.plots.delete(tileKey)
        }
      }
    }

    this._emit('harvested', { tileX, tileY, itemId: plantId, count })

    return { itemId: plantId, count }
  }

  getPlot(tileX, tileY) {
    const key = `${tileX}_${tileY}`
    const plot = this.plots.get(key)

    if (!plot) return null

    if (plot.isAnchor === false) {
      const anchorKey = plot.anchorKey
      return this.plots.get(anchorKey) || null
    }

    return plot
  }

  getReadyPlots() {
    const ready = []
    for (const [key, plot] of this.plots) {
      if (plot.isAnchor !== false && plot.isReady) {
        ready.push(plot)
      }
    }
    return ready
  }

  getAllPlots() {
    const all = []
    for (const [key, plot] of this.plots) {
      if (plot.isAnchor !== false) {
        all.push(plot)
      }
    }
    return all
  }

  on(event, callback) {
    this.listeners.push({ event, callback })
  }

  off(event, callback) {
    this.listeners = this.listeners.filter(
      l => !(l.event === event && l.callback === callback)
    )
  }

  _emit(event, data) {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        listener.callback(data)
      }
    }
  }

  toJSON() {
    const plotsObj = {}
    for (const [key, plot] of this.plots) {
      plotsObj[key] = plot
    }
    return {
      plots: plotsObj,
      savedAt: Date.now(),
    }
  }

  fromJSON(data) {
    if (!data.plots || typeof data.plots !== 'object') {
      this.plots = new Map()
      return
    }

    this.plots.clear()
    for (const [key, plot] of Object.entries(data.plots)) {
      this.plots.set(key, plot)
    }
  }
}

export const createFarmSystem = () => new FarmSystem()
