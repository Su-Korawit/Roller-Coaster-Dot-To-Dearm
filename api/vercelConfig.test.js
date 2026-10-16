import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'))
const HUB_HOSTS = ['ilovetcas.com', 'www.ilovetcas.com']

const hostOf = (rule) => rule.has?.find((h) => h.type === 'host')?.value
const rewritesFor = (host) => config.rewrites.filter((r) => hostOf(r) === host)

describe('vercel.json hub rewrites', () => {
  it.each(HUB_HOSTS)('%s sends content routes to the content function', (host) => {
    const byDest = Object.fromEntries(rewritesFor(host).map((r) => [r.source, r.destination]))
    expect(byDest['/']).toBe('/api/content?route=home')
    expect(byDest['/sitemap.xml']).toBe('/api/content?route=sitemap')
    expect(byDest['/blog/:slug']).toBe('/api/content?route=article&slug=:slug')
    expect(byDest['/category/:cat']).toBe('/api/content?route=category&cat=:cat')
    expect(byDest['/search']).toBe('/api/content?route=search')
  })

  it.each(HUB_HOSTS)('%s keeps robots.txt static', (host) => {
    const robots = rewritesFor(host).find((r) => r.source === '/robots.txt')
    expect(robots.destination).toBe('/sites/hub/robots.txt')
  })

  it('never sends app or feature-site hosts to the content function', () => {
    for (const rule of config.rewrites) {
      const host = hostOf(rule)
      if (host && !HUB_HOSTS.includes(host)) expect(rule.destination).not.toContain('/api/content')
    }
  })

  it('keeps the SPA catch-all last', () => {
    expect(config.rewrites.at(-1)).toEqual({ source: '/(.*)', destination: '/app.html' })
  })

  it('redirects legacy hub /news/:id to the new article route on the same host', () => {
    for (const host of HUB_HOSTS) {
      const rule = config.redirects.find((r) => r.source === '/news/:id' && hostOf(r) === host)
      expect(rule.destination).toBe('https://ilovetcas.com/blog/:id')
    }
  })
})

// Vercel runs api/*.js with native Node ESM: relative imports need explicit extensions.
// Everything api/content.js reaches must follow that, or the function fails at cold start.
describe('api function import extensions', () => {
  const reached = [
    'api/content.js',
    ...readdirSync(join(ROOT, 'src/content'))
      .filter((f) => f.endsWith('.js') && !f.includes('.test.') && f !== 'publishFixtures.json')
      .filter((f) => ['schema.js', 'listing.js', 'renderBody.js', 'htmlPages.js', 'firestoreRest.js'].includes(f))
      .map((f) => `src/content/${f}`),
    'src/constants/sites.js',
    'src/content/migrate.js',
  ]

  it.each(reached)('%s uses explicit .js extensions for relative imports', (file) => {
    const text = readFileSync(join(ROOT, file), 'utf8')
    const specs = [...text.matchAll(/(?:import|export)[^'"]*?from\s+['"](\.[^'"]+)['"]/g)].map((m) => m[1])
    for (const spec of specs) expect(spec, `${file} imports ${spec}`).toMatch(/\.(js|json)$/)
  })
})
