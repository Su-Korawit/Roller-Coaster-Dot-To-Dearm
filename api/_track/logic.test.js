import { describe, it, expect } from 'vitest'
import { buildUpdate, dayKey } from './logic'

const vid = 'abcdefgh1234'
const NOW = Date.UTC(2026, 10, 11, 18, 0)   // 01:00 on the 12th in Bangkok

describe('buildUpdate', () => {
  it('counts a page view, new visitor, device and referrer', () => {
    const r = buildUpdate({ vid, t: 'view', p: '/home', nv: true, dev: 'mobile', ref: 'google.com' }, NOW)
    expect(r.day).toBe('2026-11-12')
    expect(r.inc).toEqual({ views: 1, 'paths.home': 1, visitors: 1, 'devices.mobile': 1, 'refs.google_com': 1 })
  })
  it('does not count a returning visitor twice', () => {
    expect(buildUpdate({ vid, t: 'view', p: '/', nv: false }, NOW).inc.visitors).toBeUndefined()
  })
  it('counts app events by name', () => {
    expect(buildUpdate({ vid, t: 'event', n: 'app_goal' }, NOW).inc).toEqual({ 'events.app_goal': 1 })
  })
  it('rejects bad ids, names and types', () => {
    expect(buildUpdate({ vid: 'x', t: 'view' }, NOW)).toBeNull()
    expect(buildUpdate({ vid, t: 'event', n: 'a.b' }, NOW)).toBeNull()
    expect(buildUpdate({ vid, t: 'event', n: 'x'.repeat(41) }, NOW)).toBeNull()
    expect(buildUpdate({ vid, t: 'nope' }, NOW)).toBeNull()
    expect(buildUpdate(null, NOW)).toBeNull()
  })
  it('dayKey uses Bangkok time', () => {
    expect(dayKey(NOW)).toBe('2026-11-12')
  })
})
