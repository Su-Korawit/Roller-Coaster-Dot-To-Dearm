// Soft Pixel Part B is finished: no source file may carry legacy styling any more
// (retired colour names, neo-* classes, off-token hex, text under 12px). The tooling
// that defines "legacy" (this folder) is exempt.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrateSource } from './legacy'

const SRC = fileURLToPath(new URL('..', import.meta.url))
const ROOT = join(SRC, '..')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

// Components only: colour data in .js modules (MBTI/temperament palettes, map tints) is data.
const sources = walk(SRC)
  .filter((p) => p.endsWith('.jsx') && !p.includes('.test.') && !relative(SRC, p).replace(/\\/g, '/').startsWith('theme/'))
  .map((p) => relative(SRC, p).replace(/\\/g, '/'))

describe('legacy styling is gone', () => {
  it('has no legacy classes, colours or tiny text in any source file', () => {
    const offenders = sources.filter((f) => {
      const r = migrateSource(readFileSync(join(SRC, f), 'utf8'))
      return r.changes.length > 0 || r.flagged.length > 0
    })
    expect(offenders).toEqual([])
  })

  it('has no retired names in index.html or the static pages', () => {
    const pages = [join(ROOT, 'index.html'), ...walk(join(ROOT, 'public')).filter((p) => p.endsWith('.html'))].filter(existsSync)
    for (const page of pages) {
      expect(readFileSync(page, 'utf8'), page).not.toMatch(/neo-|(bg|text|border)-(surface|hud|edge|wood)/)
    }
  })

  it('has no retired colour variables anywhere in src', () => {
    const offenders = walk(SRC)
      .filter((p) => /\.(jsx?|css)$/.test(p) && !relative(SRC, p).replace(/\\/g, '/').startsWith('theme/'))
      .filter((p) => /var\(--color-(surface|hud|edge|wood[a-z-]*)\)/.test(readFileSync(p, 'utf8')))
    expect(offenders).toEqual([])
  })
})
