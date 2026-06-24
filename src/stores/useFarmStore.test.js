import { describe, it, expect, beforeEach } from 'vitest'
import { useFarmStore } from './useFarmStore'

const reset = () =>
  useFarmStore.setState({ plotsByMap: {}, currentMapKey: 'test3', plots: {} })

describe('useFarmStore', () => {
  beforeEach(reset)

  it('plants on a free tile and records plantedAt', () => {
    const ok = useFarmStore.getState().plant(5, 3, 'turnip')
    expect(ok).toBe(true)
    const plot = useFarmStore.getState().plots['5_3']
    expect(plot.plantId).toBe('turnip')
    expect(typeof plot.plantedAt).toBe('number')
  })

  it('refuses to plant on an occupied tile', () => {
    const s = useFarmStore.getState()
    s.plant(5, 3, 'turnip')
    expect(useFarmStore.getState().plant(5, 3, 'carrot')).toBe(false)
  })

  it('occupies all four tiles for a 2x2 plant with one anchor', () => {
    useFarmStore.getState().plant(6, 4, 'pumpkin')
    const plots = useFarmStore.getState().plots
    expect(plots['6_4'].plantId).toBe('pumpkin')
    expect(plots['7_4']).toEqual({ anchorKey: '6_4' })
    expect(plots['6_5']).toEqual({ anchorKey: '6_4' })
    expect(plots['7_5']).toEqual({ anchorKey: '6_4' })
  })

  it('does not harvest before ready', () => {
    useFarmStore.getState().plant(5, 3, 'turnip')
    expect(useFarmStore.getState().harvest(5, 3)).toBeNull()
  })

  it('harvests a ready plot, clears tiles, returns produce', () => {
    // Seed a turnip planted long ago so it is ready (turnip ready at 105s).
    const plantedAt = Date.now() - 200_000
    useFarmStore.setState({
      currentMapKey: 'test3',
      plotsByMap: { test3: { '5_3': { plantId: 'turnip', plantedAt, tileX: 5, tileY: 3 } } },
      plots: { '5_3': { plantId: 'turnip', plantedAt, tileX: 5, tileY: 3 } },
    })
    const result = useFarmStore.getState().harvest(5, 3, () => 0)
    expect(result).toEqual({ itemId: 'turnip', count: 1 }) // rng=0 → yieldMin
    expect(useFarmStore.getState().plots['5_3']).toBeUndefined()
  })

  it('keeps plots partitioned per map key', () => {
    useFarmStore.getState().plant(5, 3, 'turnip')
    useFarmStore.getState().setCurrentMapKey('indoor')
    expect(useFarmStore.getState().plots['5_3']).toBeUndefined()
    useFarmStore.getState().setCurrentMapKey('test3')
    expect(useFarmStore.getState().plots['5_3'].plantId).toBe('turnip')
  })
})
