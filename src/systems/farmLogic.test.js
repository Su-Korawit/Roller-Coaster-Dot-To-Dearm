import { describe, it, expect } from 'vitest'
import { tileKey, occupiedTiles, canPlant, currentStage, isReady, rollYield, resolveAnchor } from './farmLogic'
import { PLANTS } from '../data/PlantData'

const SECOND = 1000

describe('farmLogic', () => {
  it('builds a stable tile key', () => {
    expect(tileKey(5, 3)).toBe('5_3')
  })

  it('lists every tile a multi-tile plant occupies', () => {
    expect(occupiedTiles(6, 4, 'pumpkin', PLANTS)).toEqual([
      { x: 6, y: 4 }, { x: 7, y: 4 }, { x: 6, y: 5 }, { x: 7, y: 5 },
    ])
  })

  it('returns empty array for unknown plantId', () => {
    expect(occupiedTiles(0, 0, 'banana', PLANTS)).toEqual([])
  })

  it('rejects planting on an occupied tile', () => {
    const plots = { '5_3': { plantId: 'turnip', plantedAt: 0, tileX: 5, tileY: 3 } }
    expect(canPlant(plots, 5, 3, 'carrot', undefined, PLANTS)).toEqual({ ok: false, reason: 'มีพืชอยู่แล้ว' })
  })

  it('rejects an unknown plant', () => {
    expect(canPlant({}, 0, 0, 'banana', undefined, PLANTS)).toEqual({ ok: false, reason: 'ไม่รู้จักพืชนี้' })
  })

  it('allows planting on a free tile', () => {
    expect(canPlant({}, 5, 3, 'turnip', undefined, PLANTS)).toEqual({ ok: true })
  })

  it('computes deterministic stage from elapsed time', () => {
    const t0 = 1_000_000
    expect(currentStage(t0, 'turnip', t0, PLANTS)).toBe(0)
    expect(currentStage(t0, 'turnip', t0 + 15 * SECOND, PLANTS)).toBe(1)
    expect(currentStage(t0, 'turnip', t0 + 45 * SECOND, PLANTS)).toBe(2)
    expect(currentStage(t0, 'turnip', t0 + 105 * SECOND, PLANTS)).toBe(3)
    expect(currentStage(t0, 'turnip', t0 + 999 * SECOND, PLANTS)).toBe(3)
  })

  it('reports readiness only at stage 3', () => {
    const t0 = 0
    expect(isReady(t0, 'turnip', t0 + 104 * SECOND, PLANTS)).toBe(false)
    expect(isReady(t0, 'turnip', t0 + 105 * SECOND, PLANTS)).toBe(true)
  })

  it('rolls a yield within the plant range using injected rng', () => {
    expect(rollYield('turnip', () => 0, PLANTS)).toBe(1)
    expect(rollYield('turnip', () => 0.99, PLANTS)).toBe(3)
  })
})

describe('farmLogic FarmGround + anchor', () => {
  const farm = new Set(['5_3', '6_4', '7_4', '6_5', '7_5'])

  it('rejects planting when any occupied tile is off FarmGround', () => {
    expect(canPlant({}, 5, 3, 'pumpkin', farm, PLANTS)).toEqual({ ok: false, reason: 'นอกแปลงดิน' })
  })

  it('allows pumpkin when all 4 tiles are on FarmGround', () => {
    expect(canPlant({}, 6, 4, 'pumpkin', farm, PLANTS)).toEqual({ ok: true })
  })

  it('resolveAnchor returns the anchor key for a satellite tile', () => {
    const plots = {
      '6_4': { plantId: 'pumpkin', plantedAt: 0, tileX: 6, tileY: 4 },
      '7_4': { anchorKey: '6_4' }, '6_5': { anchorKey: '6_4' }, '7_5': { anchorKey: '6_4' },
    }
    expect(resolveAnchor(plots, 7, 4)).toBe('6_4')
    expect(resolveAnchor(plots, 6, 4)).toBe('6_4')
  })
})
