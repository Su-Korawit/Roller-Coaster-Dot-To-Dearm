import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { hasSplash, splashDuration, SPLASH_MS, SPLASH_REDUCED_MS } from './splashLogic'
import { OS_APPS } from '../apps'

describe('splash screen', () => {
  it('only apps with art get one, and the art file exists', () => {
    const withArt = OS_APPS.filter(hasSplash)
    expect(withArt.map((a) => a.id).sort()).toEqual(['community', 'goal', 'habit', 'reading', 'report', 'secretary', 'store'])
    for (const app of withArt) expect(fs.existsSync(`public${app.splash}`)).toBe(true)
    expect(hasSplash(OS_APPS.find((a) => a.id === 'link-dekd'))).toBe(false)   // websites open directly
    expect(hasSplash(null)).toBe(false)
  })
  it('is short, and shorter still with reduced motion', () => {
    expect(splashDuration(false)).toBe(SPLASH_MS)
    expect(splashDuration(true)).toBe(SPLASH_REDUCED_MS)
    expect(SPLASH_MS).toBeLessThanOrEqual(2500)
  })
})

import { easeOut, splashPercent, splashStatus } from './splashLogic'

describe('splash progress', () => {
  it('eases from 0 to 100 and never overshoots', () => {
    expect(splashPercent(0, 2000)).toBe(0)
    expect(splashPercent(2000, 2000)).toBe(100)
    expect(splashPercent(99999, 2000)).toBe(100)
    expect(splashPercent(-50, 2000)).toBe(0)
    expect(splashPercent(500, 2000)).toBeGreaterThan(25)     // fast start
    expect(easeOut(0.5)).toBeGreaterThan(0.5)
  })
  it('is monotonic', () => {
    let prev = -1
    for (let t = 0; t <= 2000; t += 50) { const p = splashPercent(t, 2000); expect(p).toBeGreaterThanOrEqual(prev); prev = p }
  })
  it('status text follows the percentage', () => {
    expect([0, 10, 30, 69, 70, 99, 100].map(splashStatus)).toEqual([
      'กำลังเตรียมแอป', 'กำลังเตรียมแอป', 'กำลังโหลดข้อมูลของคุณ', 'กำลังโหลดข้อมูลของคุณ', 'เกือบเสร็จแล้ว', 'เกือบเสร็จแล้ว', 'พร้อมแล้ว',
    ])
  })
})
