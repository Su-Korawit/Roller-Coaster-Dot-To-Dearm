// Soft Pixel Part B: the mechanical half of moving a screen off the legacy styling.
// Pure (no Vite/React imports) so the Node codemod (scripts/migrateTokens.mjs) and the
// ratchet test (legacyPurge.test.js) share exactly one definition of "legacy".

export const NEO_MAP = {
  'neo-btn': 'px-btn',
  'neo-card': 'px-card',
  'neo-slab': 'px-slab',
  'neo-input': 'px-input',
  'neo-sheet': 'px-sheet',
  'neo-pressed': 'px-pressed',
}

// Retired colour names → canonical tokens (same visual value after Part A's re-pointing).
export const TOKEN_MAP = {
  surface: 'paper',
  hud: 'paper',
  edge: 'line',
  'wood-edge': 'line-soft',
  'wood-light': 'mist',
  wood: 'mist',
  'wood-dark': 'hairline',
}

// Uppercase hex → token. Legacy parchment/plum/Tailwind-default colours map to the
// token that plays the same role in Soft Pixel (surface, line, accent, state).
export const HEX_MAP = {
  '#3D2B1F': 'ink', '#FFFFFF': 'paper', '#F3E5C2': 'mist', '#F8EFD6': 'mist', '#F0D9A0': 'mist',
  '#F4F7FC': 'mist', '#C8A96E': 'line-soft', '#8B6343': 'line-soft', '#AA7959': 'line-soft',
  '#DCB98A': 'hairline', '#E2E8F0': 'hairline', '#E5E7EB': 'hairline',
  '#8A4A70': 'brand', '#713970': 'brand-strong', '#7C3AED': 'brand',
  '#D99B3B': 'warn', '#E8B04A': 'warn', '#F5C542': 'warn', '#FBBF24': 'warn', '#F59E0B': 'warn',
  '#D97706': 'warn-strong',
  '#7EA04A': 'leaf', '#9DB557': 'leaf', '#6F8A3A': 'good-strong', '#C0D470': 'lime',
  '#A8E6A3': 'zone-earth-soft', '#F5A3A3': 'zone-health-soft',
  '#E6A6B4': 'zone-arts', '#D98BA0': 'zone-arts', '#D9B3CF': 'zone-soc-soft', '#FCE7F3': 'zone-arts-soft',
  '#EC4899': 'accent-pink', '#A78BDA': 'zone-soc', '#C084FC': 'zone-soc', '#9CA3AF': 'ink-soft',
}

// Tokens that are background-only (fail AA as text): when the old colour was used as
// text, switch to the readable sibling.
const TEXT_SAFE = {
  warn: 'warn-strong', leaf: 'good-strong', lime: 'good-strong', good: 'good-strong',
  'zone-earth-soft': 'zone-earth-deep', 'zone-health-soft': 'zone-health-deep',
  'zone-arts': 'zone-arts-deep', 'zone-soc': 'zone-soc-deep', 'zone-soc-soft': 'zone-soc-deep',
  'zone-arts-soft': 'zone-arts-deep', mist: 'ink', hairline: 'ink-soft',
}

// Brand marks of other companies (Google/Microsoft sign-in): never recoloured.
export const THIRD_PARTY_HEX = [
  '#EA4335', '#FBBC05', '#34A853', '#4285F4', // Google
  '#F25022', '#7FBA00', '#00A4EF', '#FFB900', // Microsoft
]

const PREFIXES = 'bg|text|border|border-[tblrxy]|ring|from|to|via|shadow|fill|stroke|outline|divide|decoration'
const LEGACY_TOKENS = Object.keys(TOKEN_MAP).sort((a, b) => b.length - a.length).join('|')

const NEO_RE = /(?<![\w-])neo-(?:btn|card|slab|input|sheet|pressed)(?![\w-])/g
const UTILITY_RE = new RegExp(`(?<![\\w-])(${PREFIXES})-(${LEGACY_TOKENS})(?=(?:\\/\\d+)?(?![\\w-]))`, 'g')
const ARBITRARY_HEX_RE = new RegExp(`(?<![\\w-])(${PREFIXES})-\\[(#[0-9a-fA-F]{6})\\]`, 'g')
const TINY_TEXT_RE = /(?<![\w-])text-\[(\d+(?:\.\d+)?)px\]/g
const CODE_HEX_RE = /(?<![\w&#-])#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w])/g
const HEX_RE = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6})(?![\w])|(?<=['"`])#[0-9a-fA-F]{3}(?=['"`])/g

function rewrite(text, line, changes) {
  const note = (kind) => (from, to) => changes.push({ line, kind, from, to })
  const neo = note('neo')
  const util = note('token')
  const hex = note('hex-class')
  const tiny = note('tiny-text')
  return text
    .replace(NEO_RE, (m) => {
      neo(m, NEO_MAP[m])
      return NEO_MAP[m]
    })
    .replace(UTILITY_RE, (m, prefix, token) => {
      const to = `${prefix}-${TOKEN_MAP[token]}`
      util(m, to)
      return to
    })
    .replace(ARBITRARY_HEX_RE, (m, prefix, value) => {
      const base = HEX_MAP[value.toUpperCase()]
      if (!base) return m
      const token = prefix === 'text' ? TEXT_SAFE[base] ?? base : base
      const to = `${prefix}-${token}`
      hex(m, to)
      return to
    })
    .replace(CODE_HEX_RE, (m) => {
      const full = m.length === 4 ? `#${[...m.slice(1)].map((c) => c + c).join('')}` : m
      const token = HEX_MAP[full.toUpperCase()]
      if (!token) return m
      const to = `var(--color-${token})`
      hex(m, to)
      return to
    })
    .replace(TINY_TEXT_RE, (m, size) => {
      if (Number(size) >= 12) return m
      tiny(m, 'text-xs')
      return 'text-xs'
    })
}

export function migrateSource(source) {
  const changes = []
  const flagged = []
  let inBlock = false
  const out = source.split('\n').map((rawLine, i) => {
    const line = i + 1
    if (inBlock) {
      if (rawLine.includes('*/')) inBlock = false
      return rawLine
    }
    if (/^\s*\/\//.test(rawLine)) return rawLine
    // Split out inline block comments so only code/strings are rewritten.
    const parts = rawLine.split(/(\/\*.*?\*\/)/)
    const last = parts[parts.length - 1]
    if (last.includes('/*') && !last.includes('*/')) inBlock = true
    const next = parts.map((part, idx) => (idx % 2 === 1 ? part : rewrite(part, line, changes))).join('')
    for (const m of next.matchAll(HEX_RE)) {
      if (!THIRD_PARTY_HEX.includes(m[0].toUpperCase())) flagged.push({ line, kind: 'hex', text: m[0] })
    }
    return next
  })
  return { code: out.join('\n'), changes, flagged }
}
