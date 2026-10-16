import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readIndexCss } from './readTheme'

const SRC = fileURLToPath(new URL('..', import.meta.url))
const css = readIndexCss()

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}
const sourceFiles = walk(SRC).filter((p) => /\.(jsx?|mjs)$/.test(p) && !/\.test\./.test(p))
const rule = (selector) => new RegExp(`${selector.replace('.', '\\.')}\\s*{([^}]*)}`).exec(css)?.[1] ?? ''

const WORDMARK_FILES = [
  'components/landing/SiteFooter.jsx',
  'components/landing/SiteNav.jsx',
  'components/TopBar.jsx',
  'components/welcome/WelcomeNav.jsx',
  'pages/AuthPage.jsx',
  'pages/HubPage.jsx',
  'pages/legal/LegalPage.jsx',
  'pages/RegisterPage.jsx',
  'components/FeatureLayout.jsx',
  'components/landing/LandingShell.jsx',
]

describe('typography', () => {
  it('uses the display font for .pixel-font', () => {
    expect(rule('.pixel-font')).toContain('var(--font-display)')
  })

  it('keeps Press Start 2P for .wordmark-font', () => {
    expect(rule('.wordmark-font')).toContain('Press Start 2P')
  })

  it('renders every Latin wordmark with the wordmark font', () => {
    for (const rel of WORDMARK_FILES) {
      const lines = readFileSync(join(SRC, rel), 'utf8').split('\n')
      lines.forEach((line, i) => {
        const isWordmark = line.includes('>I LOVE TCAS<')
        const isPixelNameChild = /^\s*\{site\.pixelName\}\s*$/.test(line)
        const target = isPixelNameChild ? lines[i - 1] : isWordmark ? line : null
        if (!target) return
        expect(target, `${rel}:${i + 1}`).toContain('wordmark-font')
        expect(target, `${rel}:${i + 1}`).not.toContain('pixel-font')
      })
    }
    for (const rel of WORDMARK_FILES) {
      expect(readFileSync(join(SRC, rel), 'utf8'), rel).toContain('wordmark-font')
    }
  })

  it('uses Press Start 2P only through .wordmark-font', () => {
    const offenders = sourceFiles.filter((p) =>
      /font-?family\s*[=:]\s*[^\n]*Press Start 2P/i.test(readFileSync(p, 'utf8')),
    )
    expect(offenders.map((p) => relative(SRC, p))).toEqual([])
  })
})
