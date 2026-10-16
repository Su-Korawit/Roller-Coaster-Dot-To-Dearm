import { describe, it, expect, vi, afterEach } from 'vitest'
import { prefersReducedMotion, subscribeReducedMotion } from './motion'

function stubMatchMedia(matches) {
  const listeners = new Set()
  const mq = {
    matches,
    addEventListener: (_, cb) => listeners.add(cb),
    removeEventListener: (_, cb) => listeners.delete(cb),
  }
  vi.stubGlobal('window', { matchMedia: vi.fn(() => mq) })
  return { mq, listeners }
}

afterEach(() => vi.unstubAllGlobals())

describe('prefersReducedMotion', () => {
  it('is true when the media query matches', () => {
    stubMatchMedia(true)
    expect(prefersReducedMotion()).toBe(true)
  })

  it('is false when it does not match', () => {
    stubMatchMedia(false)
    expect(prefersReducedMotion()).toBe(false)
  })

  it('is false when matchMedia is unavailable', () => {
    vi.stubGlobal('window', {})
    expect(prefersReducedMotion()).toBe(false)
  })

  it('is false when there is no window at all', () => {
    expect(prefersReducedMotion()).toBe(false)
  })
})

describe('subscribeReducedMotion', () => {
  it('reports changes and stops after unsubscribe', () => {
    const { mq, listeners } = stubMatchMedia(false)
    const cb = vi.fn()
    const off = subscribeReducedMotion(cb)
    mq.matches = true
    listeners.forEach((l) => l({ matches: true }))
    expect(cb).toHaveBeenCalledWith(true)
    off()
    expect(listeners.size).toBe(0)
  })

  it('returns a no-op unsubscribe when matchMedia is unavailable', () => {
    const off = subscribeReducedMotion(() => {})
    expect(() => off()).not.toThrow()
  })
})
