import { describe, it, expect } from 'vitest'
import { computeSnapPosition } from './computeSnapPosition'

// Source process block: 160x80 at (100, 100). Target process block: 160x80.
const source = { type: 'process', position: { x: 100, y: 100 } }
const target = { type: 'process', position: { x: 0, y: 0 } }

describe('computeSnapPosition', () => {
  it('right exit puts the target to the right, vertically centered', () => {
    // x = 100 + 160 = 260; y = 100 + 40 - 40 = 100
    expect(computeSnapPosition(source, target, 'right')).toEqual({ x: 260, y: 100 })
  })

  it('left exit puts the target to the left, vertically centered', () => {
    // x = 100 - 160 = -60; y = 100
    expect(computeSnapPosition(source, target, 'left')).toEqual({ x: -60, y: 100 })
  })

  it('top exit puts the target directly above, horizontally centered', () => {
    // x = 100 + 80 - 80 = 100; y = 100 - 80 = 20
    expect(computeSnapPosition(source, target, 'top')).toEqual({ x: 100, y: 20 })
  })

  it('bottom exit puts the target directly below, horizontally centered', () => {
    // x = 100; y = 100 + 80 = 180
    expect(computeSnapPosition(source, target, 'bottom')).toEqual({ x: 100, y: 180 })
  })

  it('uses measured dimensions over the type fallback when present', () => {
    const measuredSource = { type: 'process', position: { x: 100, y: 100 }, measured: { width: 200, height: 100 } }
    const measuredTarget = { type: 'process', position: { x: 0, y: 0 }, measured: { width: 200, height: 100 } }
    // right exit: x = 100 + 200 = 300 (not 260); y = 100 + 50 - 50 = 100
    expect(computeSnapPosition(measuredSource, measuredTarget, 'right')).toEqual({ x: 300, y: 100 })
  })
})
