// Soft Pixel Part B codemod.
//   node scripts/migrateTokens.mjs <file|dir>…          dry run: list changes and flags
//   node scripts/migrateTokens.mjs <file|dir>… --write  apply the automatic changes
// Flags (hex with no safe token) are never rewritten; fix them by hand.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { migrateSource } from '../src/theme/legacy.js'

const args = process.argv.slice(2)
const write = args.includes('--write')
const targets = args.filter((a) => !a.startsWith('--'))
const root = resolve(import.meta.dirname, '..')

function walk(p) {
  if (!statSync(p).isDirectory()) return [p]
  return readdirSync(p).flatMap((n) => walk(join(p, n)))
}

const files = targets
  .flatMap((t) => walk(resolve(t)))
  .filter((f) => f.endsWith('.jsx') && !f.includes('.test.'))

let changed = 0
let flags = 0
for (const file of files) {
  const rel = relative(root, file).replace(/\\/g, '/')
  const source = readFileSync(file, 'utf8')
  const r = migrateSource(source)
  for (const c of r.changes) console.log(`${rel}:${c.line} ${c.kind} ${c.from} -> ${c.to}`)
  for (const f of r.flagged) console.log(`${rel}:${f.line} FLAG ${f.kind} ${f.text}`)
  changed += r.changes.length
  flags += r.flagged.length
  if (write && r.code !== source) writeFileSync(file, r.code)
}
console.log(`${files.length} files, ${changed} automatic changes${write ? ' (written)' : ''}, ${flags} flagged`)
