import { describe, it, expect, beforeEach } from 'vitest'
import { INTROS, shouldPlayIntro, markIntroSeen, resetIntrosForTest, introDuration, STEP_MS } from './introLogic'
import { OS_APPS } from '../apps'

beforeEach(() => resetIntrosForTest())

describe('intros', () => {
  it('every core app has an intro with captions; the Store and website apps do not', () => {
    for (const id of ['goal', 'habit', 'community', 'reading', 'secretary', 'report']) {
      const app = OS_APPS.find((a) => a.id === id)
      expect(app.intro).toBe(id)
      expect(INTROS[id].steps.length).toBeGreaterThanOrEqual(3)
    }
    for (const id of ['store', 'link-dekd', 'uni-001']) expect(OS_APPS.find((a) => a.id === id).intro).toBeUndefined()
  })
  it('plays once per session and not with reduced motion', () => {
    const goal = OS_APPS.find((a) => a.id === 'goal')
    expect(shouldPlayIntro(goal)).toBe(true)
    expect(shouldPlayIntro(goal, true)).toBe(false)
    markIntroSeen('goal')
    expect(shouldPlayIntro(goal)).toBe(false)
    expect(shouldPlayIntro({ id: 'x' })).toBe(false)
    expect(shouldPlayIntro(null)).toBe(false)
  })
  it('lasts long enough for every step to be read', () => {
    expect(introDuration('habit')).toBeGreaterThan(4 * STEP_MS)
    expect(introDuration('nope')).toBeGreaterThan(0)
  })
})
