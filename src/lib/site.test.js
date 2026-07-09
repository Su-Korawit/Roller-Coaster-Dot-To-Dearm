import { describe, it, expect } from 'vitest'
import { resolveSite } from './site'
import { SITES } from '../constants/sites'

describe('resolveSite', () => {
  it('resolves the apex and www to hub', () => {
    expect(resolveSite('ilovetcas.com', '')).toBe('hub')
    expect(resolveSite('www.ilovetcas.com', '')).toBe('hub')
  })

  it('resolves each feature subdomain to its site key', () => {
    expect(resolveSite('roadmap.ilovetcas.com', '')).toBe('roadmap')
    expect(resolveSite('tcas.ilovetcas.com', '')).toBe('tcas')
    expect(resolveSite('news.ilovetcas.com', '')).toBe('news')
    expect(resolveSite('school.ilovetcas.com', '')).toBe('school')
    expect(resolveSite('app.ilovetcas.com', '')).toBe('app')
  })

  it('is case-insensitive on the hostname', () => {
    expect(resolveSite('Roadmap.ILoveTcas.com', '')).toBe('roadmap')
  })

  it('sends unknown ilovetcas.com subdomains to app', () => {
    expect(resolveSite('blog.ilovetcas.com', '')).toBe('app')
    expect(resolveSite('deep.roadmap.ilovetcas.com', '')).toBe('app')
  })

  it('sends non-canonical hosts to app by default', () => {
    expect(resolveSite('localhost', '')).toBe('app')
    expect(resolveSite('roller-coaster.vercel.app', '')).toBe('app')
    expect(resolveSite('', '')).toBe('app')
    expect(resolveSite(undefined, undefined)).toBe('app')
  })

  it('honours the ?site= override on non-canonical hosts only', () => {
    expect(resolveSite('localhost', '?site=roadmap')).toBe('roadmap')
    expect(resolveSite('preview-abc.vercel.app', '?site=hub')).toBe('hub')
    // Canonical domains ignore the override — a real host never serves another tree.
    expect(resolveSite('ilovetcas.com', '?site=roadmap')).toBe('hub')
    expect(resolveSite('school.ilovetcas.com', '?site=roadmap')).toBe('school')
  })

  it('ignores an invalid ?site= value', () => {
    expect(resolveSite('localhost', '?site=nonsense')).toBe('app')
  })

  it('has a registry entry with SEO fields for every site', () => {
    for (const site of Object.values(SITES)) {
      expect(site.key).toBeTruthy()
      expect(site.path).toMatch(/^https:\/\//)
      expect(site.title).toBeTruthy()
      expect(site.description).toBeTruthy()
      expect(site.h1).toBeTruthy()
      expect(site.intro).toBeTruthy()
    }
  })
})
