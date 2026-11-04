import { describe, it, expect } from 'vitest'
import { isValidOpenChatUrl } from './hubConfig'

describe('isValidOpenChatUrl', () => {
  it('accepts an empty value and LINE links', () => {
    expect(isValidOpenChatUrl('')).toBe(true)
    expect(isValidOpenChatUrl('  ')).toBe(true)
    expect(isValidOpenChatUrl('https://line.me/ti/g2/abc')).toBe(true)
  })

  it('rejects other hosts, plain http, look-alikes and script links', () => {
    for (const bad of ['http://line.me/ti/g2/abc', 'https://example.com/', 'https://line.me.evil.test/x', 'https://evil.test/https://line.me/', 'javascript:alert(1)', 'line.me/ti/g2/abc']) {
      expect(isValidOpenChatUrl(bad), bad).toBe(false)
    }
  })
})
