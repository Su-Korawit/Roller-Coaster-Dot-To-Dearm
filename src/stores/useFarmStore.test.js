import { describe, it, expect, beforeEach } from 'vitest'
import { useFarmStore } from './useFarmStore'
import { useFarmDataStore } from './useFarmDataStore'
import { PLANTS } from '../data/PlantData'

// Real catalog plants are all 1×1; add a synthetic 2×2 to cover multi-tile occupancy.
const PLANTS_WITH_2X2 = {
  ...PLANTS,
  squash: { id: 'squash', stages: 4, growTime: [15, 30, 60], size: { w: 2, h: 2 }, yieldMin: 1, yieldMax: 3, spriteFrames: [1, 2, 3, 4] },
}

const reset = () => {
  useFarmDataStore.setState({ plants: PLANTS_WITH_2X2, items: {}, shops: {} })
  useFarmStore.setState({ plotsByMap: {}, currentMapKey: 'test3', plots: {} })
}

describe('useFarmStore', () => {
  beforeEach(reset)

  it('plants on a free tile and records plantedAt', () => {
    const ok = useFarmStore.getState().plant(5, 3, 'rice')
    expect(ok).toBe(true)
    const plot = useFarmStore.getState().plots['5_3']
    expect(plot.plantId).toBe('rice')
    expect(typeof plot.plantedAt).toBe('number')
  })

  it('refuses to plant on an occupied tile', () => {
    const s = useFarmStore.getState()
    s.plant(5, 3, 'rice')
    expect(useFarmStore.getState().plant(5, 3, 'tomato')).toBe(false)
  })

  it('occupies all four tiles for a 2x2 plant with one anchor', () => {
    useFarmStore.getState().plant(6, 4, 'squash')
    const plots = useFarmStore.getState().plots
    expect(plots['6_4'].plantId).toBe('squash')
    expect(plots['7_4']).toEqual({ anchorKey: '6_4' })
    expect(plots['6_5']).toEqual({ anchorKey: '6_4' })
    expect(plots['7_5']).toEqual({ anchorKey: '6_4' })
  })

  it('does not harvest before ready', () => {
    useFarmStore.getState().plant(5, 3, 'rice')
    expect(useFarmStore.getState().harvest(5, 3)).toBeNull()
  })

  it('harvests a ready plot, clears tiles, returns produce', () => {
    // Seed a rice planted long ago so it is ready (rice ready at 105s).
    const plantedAt = Date.now() - 200_000
    useFarmStore.setState({
      currentMapKey: 'test3',
      plotsByMap: { test3: { '5_3': { plantId: 'rice', plantedAt, tileX: 5, tileY: 3 } } },
      plots: { '5_3': { plantId: 'rice', plantedAt, tileX: 5, tileY: 3 } },
    })
    const result = useFarmStore.getState().harvest(5, 3, () => 0)
    expect(result).toEqual({ itemId: 'rice', count: 1 }) // rng=0 → yieldMin
    expect(useFarmStore.getState().plots['5_3']).toBeUndefined()
  })

  it('keeps plots partitioned per map key', () => {
    useFarmStore.getState().plant(5, 3, 'rice')
    useFarmStore.getState().setCurrentMapKey('indoor')
    expect(useFarmStore.getState().plots['5_3']).toBeUndefined()
    useFarmStore.getState().setCurrentMapKey('test3')
    expect(useFarmStore.getState().plots['5_3'].plantId).toBe('rice')
  })
})
