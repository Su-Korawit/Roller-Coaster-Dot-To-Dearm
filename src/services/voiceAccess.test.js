import { describe, it, expect } from 'vitest'
import { isCallAllowed } from './voiceAccess'

describe('isCallAllowed', () => {
  it('allows the owner email (case/space-insensitive)', () => {
    expect(isCallAllowed('o.korawitt@gmail.com')).toBe(true)
    expect(isCallAllowed('  O.Korawitt@Gmail.com ')).toBe(true)
  })
  it('rejects other or missing emails', () => {
    expect(isCallAllowed('someone@gmail.com')).toBe(false)
    expect(isCallAllowed('')).toBe(false)
    expect(isCallAllowed(undefined)).toBe(false)
  })
})
