import { describe, it, expect } from 'vitest'
import { prerenderOutputs, robotsTxt } from './prerenderPlan.mjs'

describe('prerenderOutputs', () => {
  it('the hub is rendered on request by api/content.js, so it only ships robots.txt', () => {
    expect(prerenderOutputs('hub')).toEqual({ index: false, sitemap: false, robots: true })
  })

  it.each(['roadmap', 'tcas', 'news', 'school'])('%s keeps the full prerender', (key) => {
    expect(prerenderOutputs(key)).toEqual({ index: true, sitemap: true, robots: true })
  })
})

describe('robotsTxt', () => {
  it('points the hub sitemap at the function-rendered sitemap', () => {
    expect(robotsTxt({ path: 'https://ilovetcas.com' }, { indexable: true })).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://ilovetcas.com/sitemap.xml\n',
    )
  })

  it('disallows everything when not indexable', () => {
    expect(robotsTxt({ path: 'https://app.ilovetcas.com' }, { indexable: false })).toBe('User-agent: *\nDisallow: /\n')
  })
})
