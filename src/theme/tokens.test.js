import { describe, it, expect } from 'vitest'
import { readIndexCss, readThemeTokens } from './readTheme'
import { contrastRatio } from '../utils/contrast'

const css = readIndexCss()
const tokens = readThemeTokens(css)

const EXPECTED = {
  'color-paper': '#FFFFFF',
  'color-surface': '#FFFFFF',
  'color-hud': '#FFFFFF',
  'color-mist': '#F4F3F9',
  'color-wood-light': '#F4F3F9',
  'color-wood': '#E9E6F3',
  'color-wood-dark': '#D9D5EA',
  'color-hairline': '#D9D5EA',
  'color-line': '#5c4e92',
  'color-edge': '#5c4e92',
  'color-brand': '#5c4e92',
  'color-line-soft': '#6f63a6',
  'color-wood-edge': '#6f63a6',
  'color-brand-strong': '#463c74',
  'color-brand-soft': '#EFEBFA',
  'color-ink': '#2B2550',
  'color-ink-soft': '#6E6890',
  'color-accent-pink': '#B8467F',
  'color-leaf': '#5FB57A',
  'color-good': '#5FB57A',
  'color-good-strong': '#2F7A47',
  'color-lime': '#8FD3A4',
  'color-warn': '#E8A93B',
  'color-warn-strong': '#8A5A00',
  'color-danger': '#C2413D',
  'color-zone-health': '#E8817B',
  'color-zone-health-soft': '#FCECEB',
  'color-zone-health-deep': '#A25A56',
  'color-zone-sci': '#5B8DEF',
  'color-zone-sci-soft': '#E6EEFD',
  'color-zone-sci-deep': '#4063A7',
  'color-zone-soc': '#9B7BD6',
  'color-zone-soc-soft': '#F0EBF9',
  'color-zone-soc-deep': '#6D5696',
  'color-zone-biz': '#E8A93B',
  'color-zone-biz-soft': '#FCF2E2',
  'color-zone-biz-deep': '#8A6420',
  'color-zone-arts': '#E58BC0',
  'color-zone-arts-soft': '#FBEEF6',
  'color-zone-arts-deep': '#A06186',
  'color-zone-earth': '#5FB57A',
  'color-zone-earth-soft': '#E7F4EB',
  'color-zone-earth-deep': '#437F55',
  'radius-ui': '8px',
  'radius-slot': '12px',
  'radius-sheet': '20px',
  'shadow-px': '3px 3px 0 0 #5c4e92',
  'shadow-px-sm': '2px 2px 0 0 #5c4e92',
  'shadow-hard': '3px 3px 0 0 #5c4e92',
  'shadow-hard-sm': '2px 2px 0 0 #5c4e92',
  'font-display': "'Chakra Petch', 'Noto Sans Thai', sans-serif",
}

describe('Soft Pixel tokens', () => {
  it.each(Object.entries(EXPECTED))('defines %s with the exact value', (key, value) => {
    expect(tokens[key]?.toLowerCase()).toBe(value.toLowerCase())
  })

  it('text tokens meet AA on white', () => {
    const textKeys = [
      'ink', 'ink-soft', 'brand', 'brand-strong', 'line', 'line-soft', 'danger',
      'good-strong', 'warn-strong', 'accent-pink',
      ...['health', 'sci', 'soc', 'biz', 'arts', 'earth'].map((z) => `zone-${z}-deep`),
    ]
    for (const k of textKeys) {
      expect(contrastRatio(tokens[`color-${k}`], '#FFFFFF'), k).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('white text on filled tokens meets AA', () => {
    for (const k of ['brand', 'brand-strong', 'ink', 'danger']) {
      expect(contrastRatio('#FFFFFF', tokens[`color-${k}`]), k).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('marks background-only tokens', () => {
    for (const k of ['color-warn', 'color-good', 'color-leaf', 'color-lime']) {
      const line = css.split('\n').find((l) => l.includes(`--${k}:`))
      expect(line, k).toMatch(/background-only/)
    }
  })

  it('loads Chakra Petch, Noto Sans Thai and Press Start 2P', () => {
    const imp = css.split('\n').find((l) => l.startsWith('@import url'))
    expect(imp).toContain('family=Chakra+Petch:wght@500;600;700')
    expect(imp).toContain('Noto+Sans+Thai')
    expect(imp).toContain('Press+Start+2P')
  })
})
