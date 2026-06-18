import { describe, it, expect } from 'vitest'
import { computeNodeCenter } from './computeNodeCenter'

describe('computeNodeCenter', () => {
  it('returns the world-space centre of a block from its type size', () => {
    // process is 128x128; centre of a block at (100,100) is (164,164).
    const node = { type: 'process', position: { x: 100, y: 100 } }
    expect(computeNodeCenter(node)).toEqual({ x: 164, y: 164 })
  })

  it('uses measured dimensions over the type fallback when present', () => {
    // a resized stageLabel of 300x60 at (0,0): centre is (150,30).
    const node = { type: 'stageLabel', position: { x: 0, y: 0 }, measured: { width: 300, height: 60 } }
    expect(computeNodeCenter(node)).toEqual({ x: 150, y: 30 })
  })
})
