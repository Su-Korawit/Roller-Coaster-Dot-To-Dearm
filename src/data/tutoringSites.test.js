import { describe, it, expect } from 'vitest'
import { TUTORING_SITES, faviconUrl } from './tutoringSites'

describe('TUTORING_SITES', () => {
  it('has the 36 other sites (SmartMathPro is its own app), unique ids and https urls', () => {
    expect(TUTORING_SITES).toHaveLength(36)
    expect(new Set(TUTORING_SITES.map((s) => s.id)).size).toBe(36)
    expect(new Set(TUTORING_SITES.map((s) => s.url)).size).toBe(36)
    expect(TUTORING_SITES.every((s) => s.id.startsWith('tutor-') && s.url.startsWith('https://'))).toBe(true)
    expect(TUTORING_SITES.some((s) => /smartmathpro/.test(s.url))).toBe(false)
  })
  it('marks the sites that forbid framing', () => {
    expect(TUTORING_SITES.filter((s) => !s.embed).map((s) => s.id).sort()).toEqual(['tutor-cmcadet', 'tutor-idealphysics', 'tutor-ignite', 'tutor-looknam'])
  })
})

describe('logos', () => {
  it('only 26 of 36 use a favicon; the rest fall back to the icon tile', () => {
    expect(TUTORING_SITES.filter((s) => s.hasLogo)).toHaveLength(26)
    expect(TUTORING_SITES.find((s) => s.id === 'tutor-baankruja').hasLogo).toBe(false)   // WordPress default
    expect(TUTORING_SITES.find((s) => s.id === 'tutor-chem-ou').hasLogo).toBe(true)
  })
})

describe('faviconUrl', () => {
  it('uses the site host', () => {
    expect(faviconUrl('https://www.chem-ou.com/x')).toContain('domain=www.chem-ou.com')
    expect(faviconUrl('not a url')).toBeNull()
  })
})
