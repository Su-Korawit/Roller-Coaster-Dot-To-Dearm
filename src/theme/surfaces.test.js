import { describe, it, expect } from 'vitest'
import { readIndexCss, readThemeTokens } from './readTheme'

const css = readIndexCss()
const tokens = readThemeTokens(css)

describe('Soft Pixel surfaces', () => {
  it.each(['card', 'btn', 'slab', 'sheet', 'pressed', 'input'])(
    'defines .px-%s and no .neo alias for it',
    (n) => {
      expect(css).toMatch(new RegExp('[.]px-' + n + '\\s*[,{:]'))
      expect(css).not.toContain('.neo-' + n)
    },
  )

  it('keeps the button default radius in the components layer', () => {
    expect(css).toMatch(/@layer components\s*{[^}]*\.px-btn[^}]*border-radius/)
  })

  it('purges the parchment palette', () => {
    const lower = css.toLowerCase()
    const banned = [
      '#f3e5c2', '#f8efd6', '#e8cfa6', '#90625d', '#aa7959', '#6b4b5b', '#fbf3dd',
      '#ecd9b3', '#dcb98a', '#c49a6c', '#c0d470', '#8a4a70', '#4b3340', '#bd757e',
      '#7a3326', '#6f8a3a',
    ]
    for (const hex of banned) expect(lower, hex).not.toContain(hex)
  })

  it('draws input borders at a visible (>=3:1) line colour', () => {
    expect(css).toMatch(
      /\.px-input\s*{[^}]*border:\s*2px solid var\(--color-line-soft\)/,
    )
  })

  it('uses no pure black', () => {
    expect(css).not.toMatch(/#000(000)?\b/)
    expect(css).not.toMatch(/rgb\(\s*0\s+0\s+0/)
  })

  it('defines every theme var it uses', () => {
    const used = [...css.matchAll(/var\(--((?:color|shadow|radius|font)-[a-z0-9-]+)/g)].map((m) => m[1])
    expect(used.length).toBeGreaterThan(20)
    for (const name of new Set(used)) expect(tokens[name], name).toBeTruthy()
  })
})
