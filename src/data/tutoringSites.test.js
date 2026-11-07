import { describe, it, expect } from 'vitest'
import { TUTORING_SITES, searchTutoring, tutoringAreas } from './tutoringSites'

describe('TUTORING_SITES', () => {
  it('has 37 unique https sites', () => {
    expect(TUTORING_SITES).toHaveLength(37)
    expect(TUTORING_SITES.every((s) => s.url.startsWith('https://'))).toBe(true)
    expect(new Set(TUTORING_SITES.map((s) => s.url)).size).toBe(37)
  })
})

describe('searchTutoring', () => {
  it('matches name case-insensitively', () => {
    expect(searchTutoring('ondemand').map((s) => s.name)).toContain('OnDemand')
  })
  it('filters by province, including multi-province rows', () => {
    const names = searchTutoring('', 'เชียงใหม่').map((s) => s.name)
    expect(names).toContain('ตรงใจติวเตอร์')
    expect(names).toContain('เชียงใหม่ คาเด็ท เซ็นเตอร์')
  })
  it('online = no province', () => {
    expect(searchTutoring('', 'online').every((s) => !s.area)).toBe(true)
  })
})

describe('tutoringAreas', () => {
  it('lists each province once', () => {
    const a = tutoringAreas()
    expect(new Set(a).size).toBe(a.length)
    expect(a).toContain('ขอนแก่น')
  })
})
