// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { hasPasscode, savePasscode, verifyPasscode, clearPasscode, isValidPin, hashPasscode } from './passcode'

describe('os passcode', () => {
  beforeEach(() => localStorage.clear())

  it('accepts only 6 digits', () => {
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('12345a')).toBe(false)
    expect(isValidPin(123456)).toBe(false)
  })

  it('saves, verifies and clears', async () => {
    expect(hasPasscode('u1')).toBe(false)
    await savePasscode('u1', '123456')
    expect(hasPasscode('u1')).toBe(true)
    expect(await verifyPasscode('u1', '123456')).toBe(true)
    expect(await verifyPasscode('u1', '654321')).toBe(false)
    clearPasscode('u1')
    expect(hasPasscode('u1')).toBe(false)
  })

  it('never stores the PIN in plain text and salts by uid', async () => {
    await savePasscode('u1', '123456')
    expect(localStorage.getItem('rc-os-pass-u1')).not.toContain('123456')
    expect(await hashPasscode('u1', '123456')).not.toBe(await hashPasscode('u2', '123456'))
  })

  it('keeps passcodes separate per user', async () => {
    await savePasscode('u1', '111111')
    expect(await verifyPasscode('u2', '111111')).toBe(false)
  })

  it('rejects saving an invalid PIN', async () => {
    await expect(savePasscode('u1', '12')).rejects.toThrow()
  })
})
