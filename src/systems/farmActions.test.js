// src/systems/farmActions.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { useInventoryStore } from '../stores/useInventoryStore'
import { useFarmStore } from '../stores/useFarmStore'
import { useFarmDataStore } from '../stores/useFarmDataStore'
import { PLANTS } from '../data/PlantData'
import { ITEMS } from '../data/ItemData'
import { plantSeed, harvestAt } from './farmActions'

const farm = new Set(['5_3'])

beforeEach(() => {
  useFarmDataStore.setState({ plants: PLANTS, items: ITEMS, shops: {} })
  useInventoryStore.setState({ hotbar: Array(8).fill(null), storage: Array(30).fill(null), gold: 100 })
  useFarmStore.setState({ plotsByMap: {}, currentMapKey: 'test2', plots: {} })
})

describe('plantSeed', () => {
  it('consumes one seed and plants when valid', () => {
    useInventoryStore.getState().addItem('rice_seed', 2)
    const r = plantSeed({ tileX: 5, tileY: 3, seedItemId: 'rice_seed', farmTiles: farm })
    expect(r.ok).toBe(true)
    expect(useInventoryStore.getState().countItem('rice_seed')).toBe(1)
    expect(useFarmStore.getState().plots['5_3'].plantId).toBe('rice')
  })

  it('refuses and consumes nothing when seed missing', () => {
    const r = plantSeed({ tileX: 5, tileY: 3, seedItemId: 'rice_seed', farmTiles: farm })
    expect(r.ok).toBe(false)
    expect(useFarmStore.getState().plots['5_3']).toBeUndefined()
  })

  it('refuses and keeps the seed when tile is off FarmGround', () => {
    useInventoryStore.getState().addItem('rice_seed', 1)
    const r = plantSeed({ tileX: 0, tileY: 0, seedItemId: 'rice_seed', farmTiles: farm })
    expect(r.ok).toBe(false)
    expect(useInventoryStore.getState().countItem('rice_seed')).toBe(1)
  })
})

describe('harvestAt', () => {
  it('blocks harvest and keeps the plot when inventory is full', () => {
    const plantedAt = Date.now() - 200_000 // rice ready (>105s)
    useFarmStore.setState({
      currentMapKey: 'test2',
      plotsByMap: { test2: { '5_3': { plantId: 'rice', plantedAt, tileX: 5, tileY: 3 } } },
      plots: { '5_3': { plantId: 'rice', plantedAt, tileX: 5, tileY: 3 } },
    })
    // fill every slot with a non-stacking-with-rice item at max
    useInventoryStore.setState({
      hotbar: Array(8).fill({ itemId: 'tomato', count: 99 }),
      storage: Array(30).fill({ itemId: 'tomato', count: 99 }),
      gold: 100,
    })
    const r = harvestAt({ tileX: 5, tileY: 3 })
    expect(r.ok).toBe(false)
    expect(useFarmStore.getState().plots['5_3']).toBeDefined()
  })

  it('harvests a ready plot into inventory', () => {
    const plantedAt = Date.now() - 200_000
    useFarmStore.setState({
      currentMapKey: 'test2',
      plotsByMap: { test2: { '5_3': { plantId: 'rice', plantedAt, tileX: 5, tileY: 3 } } },
      plots: { '5_3': { plantId: 'rice', plantedAt, tileX: 5, tileY: 3 } },
    })
    const r = harvestAt({ tileX: 5, tileY: 3 })
    expect(r.ok).toBe(true)
    expect(useInventoryStore.getState().countItem('rice')).toBeGreaterThanOrEqual(1)
    expect(useFarmStore.getState().plots['5_3']).toBeUndefined()
  })

  it('does nothing on an empty tile', () => {
    expect(harvestAt({ tileX: 5, tileY: 3 }).ok).toBe(false)
  })
})
