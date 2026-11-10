import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { LOADING_BACKDROPS, LOADING_TIPS, backdropFor, tipFor, backdropUrl, LOADING_AD_ENABLED } from './loadingBackdrops'

describe('loading scene helpers', () => {
  it('every backdrop file exists in both orientations', () => {
    for (const n of LOADING_BACKDROPS) {
      expect(fs.existsSync(`public${backdropUrl(n, true)}`)).toBe(true)
      expect(fs.existsSync(`public${backdropUrl(n, false)}`)).toBe(true)
    }
  })
  it('picks wrap around and never throw', () => {
    expect(LOADING_BACKDROPS).toContain(backdropFor(999))
    expect(LOADING_TIPS).toContain(tipFor(-7))
  })
  it('ads are off until switched on', () => {
    expect(LOADING_AD_ENABLED).toBe(false)
  })
})
