import { describe, it, expect } from 'vitest'
import { computeMainLineY } from './computeMainLineY'

describe('computeMainLineY', () => {
  it('returns null when there are no stageLabel nodes', () => {
    expect(computeMainLineY([{ id: 'a', type: 'process', position: { x: 0, y: 0 }, data: {} }])).toBeNull()
  })

  it('returns the vertical center of the first stageLabel node in array order', () => {
    const nodes = [
      { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 100 }, width: 200, height: 40, data: {} },
      { id: 'stage-2', type: 'stageLabel', position: { x: 300, y: 900 }, width: 200, height: 40, data: {} },
    ]
    expect(computeMainLineY(nodes)).toBe(120)
  })

  it('falls back to the default stageLabel height (40) when height is not set', () => {
    const nodes = [{ id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 100 }, data: {} }]
    expect(computeMainLineY(nodes)).toBe(120)
  })

  it('ignores non-stageLabel nodes that appear earlier in the array', () => {
    const nodes = [
      { id: 'proc-1', type: 'process', position: { x: 0, y: 5 }, data: {} },
      { id: 'stage-1', type: 'stageLabel', position: { x: 0, y: 100 }, width: 200, height: 40, data: {} },
    ]
    expect(computeMainLineY(nodes)).toBe(120)
  })
})
