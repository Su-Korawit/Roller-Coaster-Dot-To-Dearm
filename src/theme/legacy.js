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

// Uppercase hex → token, only for roles that stay AA-safe. Anything else is flagged.
export const HEX_MAP = {
  '#3D2B1F': 'ink',
  '#FFFFFF': 'paper',
  '#F3E5C2': 'mist',
  '#F8EFD6': 'mist',
  '#F0D9A0': 'mist',
  '#C8A96E': 'line-soft',
  '#8B6343': 'line-soft',
  '#E2E8F0': 'hairline',
  '#E5E7EB': 'hairline',
  '#F4F7FC': 'mist',
}

// Brand marks of other companies (Google sign-in): never recoloured.
export const THIRD_PARTY_HEX = ['#EA4335', '#FBBC05', '#34A853', '#4285F4']

const PREFIXES = 'bg|text|border|border-[tblrxy]|ring|from|to|via|shadow|fill|stroke|outline|divide|decoration'
const LEGACY_TOKENS = Object.keys(TOKEN_MAP).sort((a, b) => b.length - a.length).join('|')

const NEO_RE = /(?<![\w-])neo-(?:btn|card|slab|input|sheet|pressed)(?![\w-])/g
const UTILITY_RE = new RegExp(`(?<![\\w-])(${PREFIXES})-(${LEGACY_TOKENS})(?=(?:\\/\\d+)?(?![\\w-]))`, 'g')
const ARBITRARY_HEX_RE = new RegExp(`(?<![\\w-])(${PREFIXES})-\\[(#[0-9a-fA-F]{6})\\]`, 'g')
const TINY_TEXT_RE = /(?<![\w-])text-\[(\d+(?:\.\d+)?)px\]/g
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
      const token = HEX_MAP[value.toUpperCase()]
      if (!token) return m
      const to = `${prefix}-${token}`
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
