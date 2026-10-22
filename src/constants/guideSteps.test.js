import { describe, it, expect } from 'vitest'
import { GUIDE_STEPS, nextAvailable } from './guideSteps'

const ctx = (over = {}) => ({
  signedIn: true, practiceDone: false, hasPurchased: false, canAffordSomething: true,
  hasUnplacedItem: true, hasCustomRoom: false, places: 2, hasCampus: true, ...over,
})

describe('GUIDE_STEPS', () => {
  it('has the five steps in order, each with a target, an event and Thai text', () => {
    expect(GUIDE_STEPS.map((s) => s.id)).toEqual(['practice', 'buy', 'decorate', 'warp', 'plan'])
    for (const s of GUIDE_STEPS) {
      if (s.target !== null) expect(s.target).toMatch(/^\[data-guide=/)
      if (s.fallbackTarget) expect(s.fallbackTarget).toMatch(/^\[data-guide=/)
      expect(s.doneOn.length).toBeGreaterThan(0)
      expect(s.textTh.length).toBeGreaterThan(0)
    }
  })

  it('the practice step points at no element: only its own bubble button starts the practice', () => {
    const practice = GUIDE_STEPS.find((s) => s.id === 'practice')
    expect(practice.target).toBeNull()
    expect(practice.action).toBe('practice')
    expect(practice.textTh).not.toContain('แตะนาฬิกา')
  })

  it('plan is available exactly where the campus exists (guest or signed in)', () => {
    const plan = GUIDE_STEPS.find((s) => s.id === 'plan')
    expect(plan.available(ctx())).toBe(true)
    expect(plan.available(ctx({ signedIn: false }))).toBe(true)
    expect(plan.available(ctx({ hasCampus: false }))).toBe(false)
  })
})

describe('nextAvailable', () => {
  it('starts at the first step for a fresh signed-in student', () => {
    expect(nextAvailable(0, ctx())).toBe(0)
  })

  it('skips the practice step once the gift was taken', () => {
    expect(nextAvailable(0, ctx({ practiceDone: true }))).toBe(1)
  })

  it('does not trap a student who cannot buy anything (no Leaves) — buy and decorate are skipped', () => {
    expect(nextAvailable(1, ctx({ canAffordSomething: false, hasUnplacedItem: false }))).toBe(3)
  })

  it('skips buy when something was already bought, and decorate when the room was already changed', () => {
    expect(nextAvailable(1, ctx({ hasPurchased: true }))).toBe(2)
    expect(nextAvailable(2, ctx({ hasCustomRoom: true }))).toBe(3)
  })

  it('a guest only reaches the warp step (with somewhere to go) and the plan step (where the campus exists)', () => {
    expect(nextAvailable(0, ctx({ signedIn: false }))).toBe(3)
    expect(nextAvailable(0, ctx({ signedIn: false, places: 1 }))).toBe(4)
    expect(nextAvailable(0, ctx({ signedIn: false, places: 1, hasCampus: false }))).toBe(GUIDE_STEPS.length)
  })

  it('returns the end when nothing is left', () => {
    expect(nextAvailable(4, ctx({ hasCampus: false }))).toBe(GUIDE_STEPS.length)
    expect(nextAvailable(5, ctx())).toBe(GUIDE_STEPS.length)
    expect(nextAvailable(99, ctx())).toBe(GUIDE_STEPS.length)
  })
})
