import { describe, it, expect } from 'vitest'
import { appIdFromSearch } from './deepLink'

describe('appIdFromSearch', () => {
  it('reads a plain app id', () => {
    expect(appIdFromSearch('?open=countdown')).toBe('countdown')
    expect(appIdFromSearch('?x=1&open=link-mytcas')).toBe('link-mytcas')
  })
  it('rejects empty, odd or missing values', () => {
    expect(appIdFromSearch('')).toBeNull()
    expect(appIdFromSearch('?open=')).toBeNull()
    expect(appIdFromSearch('?open=../x')).toBeNull()
    expect(appIdFromSearch('?open=A B')).toBeNull()
    expect(appIdFromSearch('?open=' + 'a'.repeat(41))).toBeNull()
  })
})
