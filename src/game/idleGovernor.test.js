import { describe, it, expect, vi } from 'vitest'
import { createIdleGovernor, setFpsLimit } from './idleGovernor'

describe('idleGovernor', () => {
  it('fires onIdle once after idleAfterMs without input', () => {
    let t = 0
    const onIdle = vi.fn()
    const g = createIdleGovernor({ idleAfterMs: 1000, onIdle, now: () => t })
    t = 999; g.tick()
    expect(onIdle).not.toHaveBeenCalled()
    t = 1000; g.tick(); g.tick()
    expect(onIdle).toHaveBeenCalledTimes(1)
    expect(g.isIdle()).toBe(true)
  })

  it('touch() while idle fires onActive and restarts the clock', () => {
    let t = 0
    const onIdle = vi.fn()
    const onActive = vi.fn()
    const g = createIdleGovernor({ idleAfterMs: 1000, onIdle, onActive, now: () => t })
    t = 1000; g.tick()
    t = 1500; g.touch()
    expect(onActive).toHaveBeenCalledTimes(1)
    t = 2400; g.tick()
    expect(onIdle).toHaveBeenCalledTimes(1)   // clock restarted at 1500
    t = 2500; g.tick()
    expect(onIdle).toHaveBeenCalledTimes(2)
  })

  it('touch() while active does not fire onActive', () => {
    const onActive = vi.fn()
    const g = createIdleGovernor({ onActive })
    g.touch()
    expect(onActive).not.toHaveBeenCalled()
  })
})

describe('setFpsLimit', () => {
  it('sets and clears the cap fields on game.loop', () => {
    const game = { loop: { fpsLimit: 0, hasFpsLimit: false, _limitRate: 0 } }
    setFpsLimit(game, 10)
    expect(game.loop).toMatchObject({ fpsLimit: 10, hasFpsLimit: true, _limitRate: 100 })
    setFpsLimit(game, 0)
    expect(game.loop).toMatchObject({ fpsLimit: 0, hasFpsLimit: false, _limitRate: 0 })
  })

  it('is a no-op without a loop', () => {
    expect(() => setFpsLimit(null, 10)).not.toThrow()
  })
})
