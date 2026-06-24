import { describe, it, expect } from 'vitest'
import { tileKey, occupiedTiles, canPlant, currentStage, isReady, rollYield } from './farmLogic'

// turnip growTime = [15, 30, 60] seconds → reaches stage1@15s, stage2@45s, stage3@105s
const SECOND = 1000

describe('farmLogic', () => {
  it('builds a stable tile key', () => {
    expect(tileKey(5, 3)).toBe('5_3')
  })

  it('lists every tile a multi-tile plant occupies', () => {
    expect(occupiedTiles(6, 4, 'pumpkin')).toEqual([
      { x: 6, y: 4 }, { x: 7, y: 4 }, { x: 6, y: 5 }, { x: 7, y: 5 },
    ])
  })

  it('rejects planting on an occupied tile', () => {
    const plots = { '5_3': { plantId: 'turnip', plantedAt: 0, tileX: 5, tileY: 3 } }
    expect(canPlant(plots, 5, 3, 'carrot')).toEqual({ ok: false, reason: 'มีพืชอยู่แล้ว' })
  })

  it('rejects an unknown plant', () => {
    expect(canPlant({}, 0, 0, 'banana')).toEqual({ ok: false, reason: 'ไม่รู้จักพืชนี้' })
  })

  it('allows planting on a free tile', () => {
    expect(canPlant({}, 5, 3, 'turnip')).toEqual({ ok: true })
  })

  it('computes deterministic stage from elapsed time', () => {
    const t0 = 1_000_000
    expect(currentStage(t0, 'turnip', t0)).toBe(0)
    expect(currentStage(t0, 'turnip', t0 + 15 * SECOND)).toBe(1)
    expect(currentStage(t0, 'turnip', t0 + 45 * SECOND)).toBe(2)
    expect(currentStage(t0, 'turnip', t0 + 105 * SECOND)).toBe(3)
    expect(currentStage(t0, 'turnip', t0 + 999 * SECOND)).toBe(3) // capped
  })

  it('reports readiness only at stage 3', () => {
    const t0 = 0
    expect(isReady(t0, 'turnip', t0 + 104 * SECOND)).toBe(false)
    expect(isReady(t0, 'turnip', t0 + 105 * SECOND)).toBe(true)
  })

  it('rolls a yield within the plant range using injected rng', () => {
    // turnip yieldMin=1, yieldMax=3 → span 3
    expect(rollYield('turnip', () => 0)).toBe(1)
    expect(rollYield('turnip', () => 0.99)).toBe(3)
  })
})
