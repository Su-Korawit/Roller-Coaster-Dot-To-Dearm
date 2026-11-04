import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

// bg-warn / bg-good / bg-lime / bg-leaf are background-only (they fail AA behind text).
// White text on them is unreadable; use text-ink or the *-strong fills.
describe('background-only tokens carry readable text', () => {
  it('never pairs white text with bg-warn, bg-good, bg-lime or bg-leaf', () => {
    const offenders = []
    for (const file of walk(SRC).filter((p) => p.endsWith('.jsx') && !p.includes('.test.'))) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        if (!/\bbg-(warn|good|lime|leaf)\b(?![-/])/.test(line)) return
        const near = lines.slice(Math.max(0, i - 2), i + 3).join(' ')
        if (/\btext-white\b/.test(near)) offenders.push(`${relative(SRC, file)}:${i + 1}`)
      })
    }
    expect(offenders).toEqual([])
  })
})
