import { describe, it, expect } from 'vitest'
import { slipErrorMessage, SLIP_FAIL_MESSAGES } from './shopMessages'

describe('slipErrorMessage', () => {
  it('returns the mapped Thai message for a known fail code', () => {
    expect(slipErrorMessage('DUPLICATE_SLIP')).toBe(SLIP_FAIL_MESSAGES.DUPLICATE_SLIP)
  })

  it('falls back to a Thai message for unknown or undefined codes', () => {
    const fallback = slipErrorMessage(undefined)
    expect(fallback).toMatch(/[ก-๛]/) // contains Thai characters
    expect(slipErrorMessage('failed-precondition')).toBe(fallback)
    expect(SLIP_FAIL_MESSAGES['failed-precondition']).toBeUndefined()
  })
})
