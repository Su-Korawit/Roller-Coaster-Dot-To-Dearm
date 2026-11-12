import { describe, it, expect } from 'vitest'
import { shouldReloadForVoice } from './voiceSyncLogic'

describe('shouldReloadForVoice', () => {
  it('ignores the first snapshot and unchanged values', () => {
    expect(shouldReloadForVoice(undefined, 5)).toBe(false)
    expect(shouldReloadForVoice(5, 5)).toBe(false)
    expect(shouldReloadForVoice(null, null)).toBe(false)
  })
  it('reloads when the server bumps the revision after the first snapshot', () => {
    expect(shouldReloadForVoice(null, 5)).toBe(true)
    expect(shouldReloadForVoice(5, 9)).toBe(true)
  })
  it('ignores a missing or invalid revision', () => {
    expect(shouldReloadForVoice(5, null)).toBe(false)
    expect(shouldReloadForVoice(5, 0)).toBe(false)
  })
})
