import { describe, it, expect } from 'vitest'
import { tileKey, occupiedTiles, canPlant, currentStage, isReady, rollYield, resolveAnchor } from './farmLogic'

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

  it('returns empty array for unknown plantId', () => {
    expect(occupiedTiles(0, 0, 'banana')).toEqual([])
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

describe('farmLogic FarmGround + anchor', () => {
  const farm = new Set(['5_3', '6_4', '7_4', '6_5', '7_5'])

  it('rejects planting when any occupied tile is off FarmGround', () => {
    // pumpkin is 2x2 anchored at 6,4 → needs 6_4,7_4,6_5,7_5 (all present) → ok
    expect(canPlant({}, 6, 4, 'pumpkin', farm)).toEqual({ ok: true })
    // anchor 5,3 single turnip on farm → ok
    expect(canPlant({}, 5, 3, 'turnip', farm)).toEqual({ ok: true })
    // turnip on a non-farm tile → rejected
    expect(canPlant({}, 0, 0, 'turnip', farm)).toEqual({ ok: false, reason: 'นอกแปลงดิน' })
  })

  it('rejects a 2x2 plant straddling the FarmGround edge', () => {
    const edgeFarm = new Set(['6_4', '7_4']) // bottom row missing
    expect(canPlant({}, 6, 4, 'pumpkin', edgeFarm)).toEqual({ ok: false, reason: 'นอกแปลงดิน' })
  })

  it('skips the FarmGround check when farmTiles is omitted', () => {
    expect(canPlant({}, 0, 0, 'turnip')).toEqual({ ok: true })
  })

  it('resolves a satellite tile to its anchor key', () => {
    const plots = { '6_4': { plantId: 'pumpkin', plantedAt: 0 }, '7_5': { anchorKey: '6_4' } }
    expect(resolveAnchor(plots, 7, 5)).toBe('6_4')
    expect(resolveAnchor(plots, 6, 4)).toBe('6_4')
    expect(resolveAnchor(plots, 1, 1)).toBe('1_1')
  })
})
