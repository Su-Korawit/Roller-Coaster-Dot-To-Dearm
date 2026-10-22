import { describe, it, expect, vi } from 'vitest'
import { createFocusGuard } from './focusGuard'

const make = (mode) => {
  let t = 1_000_000
  const onWither = vi.fn()
  const guard = createFocusGuard({ mode, now: () => t, onWither })
  return { guard, onWither, advance: (ms) => { t += ms } }
}

describe('strict guard', () => {
  it('does not wither for a 9 second glance away', () => {
    const { guard, onWither, advance } = make('strict')
    guard.onHidden()
    advance(9000)
    guard.onVisible()
    expect(onWither).not.toHaveBeenCalled()
  })

  it('withers when the page was hidden for more than 10 seconds', () => {
    const { guard, onWither, advance } = make('strict')
    guard.onHidden()
    advance(11000)
    guard.onVisible()
    expect(onWither).toHaveBeenCalledTimes(1)
    expect(onWither).toHaveBeenCalledWith('hidden')
  })

  it('exactly 10 seconds is still fine', () => {
    const { guard, onWither, advance } = make('strict')
    guard.onHidden()
    advance(10000)
    guard.onVisible()
    expect(onWither).not.toHaveBeenCalled()
  })

  it('catches a tab that stays hidden even when timers are throttled to one tick', () => {
    const { guard, onWither, advance } = make('strict')
    guard.onHidden()
    advance(60000)
    guard.tick()
    expect(onWither).toHaveBeenCalledTimes(1)
  })

  it('fires only once however often it is called afterwards', () => {
    const { guard, onWither, advance } = make('strict')
    guard.onHidden()
    advance(20000)
    guard.tick()
    guard.tick()
    guard.onVisible()
    guard.onHidden()
    advance(30000)
    guard.onVisible()
    expect(onWither).toHaveBeenCalledTimes(1)
  })

  it('survives many short round trips', () => {
    const { guard, onWither, advance } = make('strict')
    for (let i = 0; i < 20; i++) {
      guard.onHidden()
      advance(2000)
      guard.onVisible()
      advance(5000)
    }
    expect(onWither).not.toHaveBeenCalled()
  })

  it('ignores a visible event with no matching hidden event', () => {
    const { guard, onWither } = make('strict')
    guard.onVisible()
    guard.tick()
    expect(onWither).not.toHaveBeenCalled()
  })
})

describe('flexible guard', () => {
  it('allows up to two minutes away', () => {
    const { guard, onWither, advance } = make('flexible')
    guard.onHidden()
    advance(100000)
    guard.onVisible()
    expect(onWither).not.toHaveBeenCalled()
  })

  it('withers with reason away after more than two minutes', () => {
    const { guard, onWither, advance } = make('flexible')
    guard.onHidden()
    advance(130000)
    guard.onVisible()
    expect(onWither).toHaveBeenCalledWith('away')
  })
})
