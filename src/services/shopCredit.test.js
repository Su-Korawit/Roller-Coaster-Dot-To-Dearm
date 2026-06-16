import { describe, it, expect } from 'vitest'
import { creditForResult } from './shopCredit'

describe('creditForResult', () => {
  it('credits the coins from a valid first verification', () => {
    expect(creditForResult('p1', { ok: true, coins: 100 })).toBe(100)
  })

  it('does not credit again when the same purchase is resent', () => {
    expect(creditForResult('p2', { ok: true, coins: 100 })).toBe(100)
    expect(creditForResult('p2', { ok: true, coins: 100 })).toBe(0)
  })

  it('does not credit a failed verification', () => {
    expect(creditForResult('p3', { ok: false, reason: 'WRONG_AMOUNT' })).toBe(0)
  })

  it('does not credit a missing or non-positive amount', () => {
    expect(creditForResult('p4', { ok: true, coins: undefined })).toBe(0)
    expect(creditForResult('p5', { ok: true, coins: 0 })).toBe(0)
    expect(creditForResult('p6', { ok: true, coins: -50 })).toBe(0)
  })
})
