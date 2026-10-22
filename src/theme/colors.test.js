import { describe, it, expect } from 'vitest'
import { readIndexCss, readThemeTokens } from './readTheme'
import { colors } from './colors'

const tokens = readThemeTokens(readIndexCss())
const kebab = (k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

describe('colors', () => {
  it('mirrors the @theme tokens exactly', () => {
    for (const [key, hex] of Object.entries(colors)) {
      expect(tokens[`color-${kebab(key)}`]?.toUpperCase(), key).toBe(hex.toUpperCase())
    }
  })

  it('covers the canonical surface, line, text and state tokens', () => {
    for (const k of ['paper', 'mist', 'hairline', 'line', 'lineSoft', 'ink', 'inkSoft', 'brand', 'brandStrong', 'brandSoft', 'leaf', 'good', 'warn', 'danger']) {
      expect(colors[k], k).toBeTruthy()
    }
  })
})
