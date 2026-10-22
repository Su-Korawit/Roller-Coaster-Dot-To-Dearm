// Ratchet: screens migrate group by group. Files under LEGACY_ALLOWED may still carry
// legacy styling; everything else must be clean, and an allowlist entry that no longer
// matches an offending file must be deleted so the list can only shrink.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrateSource } from './legacy'
import { LEGACY_ALLOWED } from './legacyAllowlist'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const files = walk(SRC)
  .filter((p) => p.endsWith('.jsx') && !p.includes('.test.'))
  .map((p) => relative(SRC, p).replace(/\\/g, '/'))

const offends = (rel) => {
  const r = migrateSource(readFileSync(join(SRC, rel), 'utf8'))
  return r.changes.length > 0 || r.flagged.length > 0
}
const allowed = (rel) => LEGACY_ALLOWED.some((p) => rel === p || (p.endsWith('/') && rel.startsWith(p)))

describe('legacy styling ratchet', () => {
  it('has no legacy styling outside the allowlist', () => {
    const offenders = files.filter((f) => !allowed(f) && offends(f))
    expect(offenders).toEqual([])
  })

  it('has no stale allowlist entries', () => {
    const stale = LEGACY_ALLOWED.filter((p) => !files.some((f) => (f === p || (p.endsWith('/') && f.startsWith(p))) && offends(f)))
    expect(stale).toEqual([])
  })
})
