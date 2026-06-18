import { describe, it, expect } from 'vitest'
import { computeCenteredPosition } from './computeCenteredPosition'

describe('computeCenteredPosition', () => {
  it('returns the top-left so a block of the given type is centred on a point', () => {
    // process is 128x128; centred on (200,200) -> top-left (136,136).
    expect(computeCenteredPosition({ x: 200, y: 200 }, 'process')).toEqual({ x: 136, y: 136 })
  })

  it('uses the type size for non-square blocks', () => {
    // stageLabel default is 120x40; centred on (60,60) -> top-left (0,40).
    expect(computeCenteredPosition({ x: 60, y: 60 }, 'stageLabel')).toEqual({ x: 0, y: 40 })
  })
})
