import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { hasSplash, splashDuration, SPLASH_MS, SPLASH_REDUCED_MS } from './splashLogic'
import { OS_APPS } from '../apps'

describe('splash screen', () => {
  it('only apps with art get one, and the art file exists', () => {
    const withArt = OS_APPS.filter(hasSplash)
    expect(withArt.map((a) => a.id).sort()).toEqual(['community', 'goal', 'habit'])
    for (const app of withArt) expect(fs.existsSync(`public${app.splash}`)).toBe(true)
    expect(hasSplash(OS_APPS.find((a) => a.id === 'store'))).toBe(false)
    expect(hasSplash(null)).toBe(false)
  })
  it('is short, and shorter still with reduced motion', () => {
    expect(splashDuration(false)).toBe(SPLASH_MS)
    expect(splashDuration(true)).toBe(SPLASH_REDUCED_MS)
    expect(SPLASH_MS).toBeLessThanOrEqual(2500)
  })
})
