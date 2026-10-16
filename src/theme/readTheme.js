// Node-side helpers for theme tests: read src/index.css and its @theme tokens.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function readIndexCss() {
  return readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')
}

// Custom properties declared inside `@theme { … }`, keyed without the leading `--`.
export function readThemeTokens(cssText) {
  const start = cssText.indexOf('@theme')
  if (start === -1) return {}
  const open = cssText.indexOf('{', start)
  let depth = 0
  let end = open
  for (let i = open; i < cssText.length; i++) {
    if (cssText[i] === '{') depth++
    else if (cssText[i] === '}' && --depth === 0) { end = i; break }
  }
  const block = cssText.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, '')
  const tokens = {}
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) tokens[m[1]] = m[2].trim()
  return tokens
}
