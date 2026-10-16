import { describe, it, expect } from 'vitest'
import { createAmbientClock } from './ambientClock'

describe('createAmbientClock', () => {
  it('cycles frames at the requested fps', () => {
    const { frameFor } = createAmbientClock()
    const spec = { frames: 4, fps: 4 }
    expect([0, 250, 500, 750, 1000, 1250].map((t) => frameFor(spec, t))).toEqual([0, 1, 2, 3, 0, 1])
  })

  it('offsets a loop so objects do not pulse in sync', () => {
    const { frameFor } = createAmbientClock()
    expect(frameFor({ frames: 4, fps: 4, offset: 1 }, 0)).toBe(1)
    expect(frameFor({ frames: 4, fps: 4, offset: 3 }, 250)).toBe(0)
  })

  it('holds frame 0 under reduced motion', () => {
    const { frameFor } = createAmbientClock({ reducedMotion: true })
    expect([0, 250, 500].map((t) => frameFor({ frames: 4, fps: 4 }, t))).toEqual([0, 0, 0])
  })

  it('holds frame 0 while idle and resumes afterwards', () => {
    let idle = true
    const { frameFor } = createAmbientClock({ isIdle: () => idle })
    expect(frameFor({ frames: 4, fps: 4 }, 500)).toBe(0)
    idle = false
    expect(frameFor({ frames: 4, fps: 4 }, 500)).toBe(2)
  })

  it('rejects fps outside 4–8 and frame counts outside 1–8', () => {
    const { frameFor } = createAmbientClock()
    expect(() => frameFor({ frames: 4, fps: 12 }, 0)).toThrow(RangeError)
    expect(() => frameFor({ frames: 4, fps: 3 }, 0)).toThrow(RangeError)
    expect(() => frameFor({ frames: 9, fps: 4 }, 0)).toThrow(RangeError)
    expect(() => frameFor({ frames: 0, fps: 4 }, 0)).toThrow(RangeError)
  })
})
