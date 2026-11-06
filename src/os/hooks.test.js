import { describe, it, expect } from 'vitest'
import { deviceFor, formatTime } from './hooks'

describe('deviceFor', () => {
  it('maps widths to phone / tablet / desktop', () => {
    expect(deviceFor(390).device).toBe('phone')
    expect(deviceFor(768).device).toBe('tablet')
    expect(deviceFor(1280).device).toBe('desktop')
  })
  it('switches exactly at the breakpoints', () => {
    expect(deviceFor(639).device).toBe('phone')
    expect(deviceFor(640).device).toBe('tablet')
    expect(deviceFor(1023).device).toBe('tablet')
    expect(deviceFor(1024).device).toBe('desktop')
  })
})

describe('formatTime', () => {
  it('uses a 24-hour HH:mm clock', () => {
    expect(formatTime(new Date(2026, 10, 6, 4, 30))).toMatch(/^04[:.]30$/)
  })
})
