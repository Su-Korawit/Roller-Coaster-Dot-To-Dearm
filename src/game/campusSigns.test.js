import { describe, it, expect } from 'vitest'
import { signAlpha, shouldPlayIntro, INTRO_MS, SIGN_NEAR, SIGN_FAR, INTRO_KEY, introSeen, markIntroSeen } from './campusSigns'

describe('signAlpha', () => {
  it('shows the name at close range, nothing from afar, and fades in between', () => {
    expect(signAlpha(0)).toBe(1)
    expect(signAlpha(SIGN_NEAR)).toBe(1)
    expect(signAlpha(SIGN_FAR)).toBe(0)
    expect(signAlpha(SIGN_FAR + 20)).toBe(0)
    const mid = signAlpha((SIGN_NEAR + SIGN_FAR) / 2)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
  })
  it('never goes outside 0..1 and survives junk', () => {
    expect(signAlpha(-5)).toBe(1)
    expect(signAlpha(NaN)).toBe(0)
    expect(signAlpha(undefined)).toBe(0)
  })
})

describe('shouldPlayIntro', () => {
  it('plays once on a first visit with motion allowed and no remembered spot', () => {
    expect(shouldPlayIntro({ seen: false, reducedMotion: false, hasResume: false })).toBe(true)
  })
  it.each([
    [{ seen: true, reducedMotion: false, hasResume: false }],
    [{ seen: false, reducedMotion: true, hasResume: false }],
    [{ seen: false, reducedMotion: false, hasResume: true }],
  ])('is skipped for %j', (args) => expect(shouldPlayIntro(args)).toBe(false))
  it('lasts about two seconds at most', () => {
    expect(INTRO_MS).toBeLessThanOrEqual(2000)
  })
})

describe('intro memory', () => {
  it('remembers in storage and never throws when storage is unavailable', () => {
    const mem = {}
    const storage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v } }
    expect(introSeen(storage)).toBe(false)
    markIntroSeen(storage)
    expect(mem[INTRO_KEY]).toBe('1')
    expect(introSeen(storage)).toBe(true)
    const broken = { getItem: () => { throw new Error('no') }, setItem: () => { throw new Error('no') } }
    expect(introSeen(broken)).toBe(false)
    expect(() => markIntroSeen(broken)).not.toThrow()
    expect(introSeen(undefined)).toBe(false)
  })
})
