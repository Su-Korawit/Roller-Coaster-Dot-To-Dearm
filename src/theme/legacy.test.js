import { describe, it, expect } from 'vitest'
import { migrateSource, TOKEN_MAP, NEO_MAP, HEX_MAP, THIRD_PARTY_HEX } from './legacy'

const run = (src) => migrateSource(src)

describe('migrateSource', () => {
  it('renames neo-* surfaces and legacy utilities, keeping opacity suffixes', () => {
    const r = run('<div className="neo-card bg-surface border-edge/40">')
    expect(r.code).toBe('<div className="px-card bg-paper border-line/40">')
    expect(r.changes).toHaveLength(3)
  })

  it('prefers the longest legacy token (wood-edge is not wood + -edge)', () => {
    expect(run('"bg-wood-edge"').code).toBe('"bg-line-soft"')
    expect(run('"bg-wood-dark/50 bg-wood-light bg-wood"').code).toBe('"bg-hairline/50 bg-mist bg-mist"')
  })

  it('maps arbitrary-value hex that has a safe token', () => {
    expect(run('"bg-[#3D2B1F] text-[#3d2b1f]"').code).toBe('"bg-ink text-ink"')
  })

  it('raises sub-12px text to text-xs and leaves 12px and up alone', () => {
    expect(run('"text-[10px] text-[9px] text-[11px]"').code).toBe('"text-xs text-xs text-xs"')
    expect(run('"text-[12px] text-[13px] text-xs"').code).toBe('"text-[12px] text-[13px] text-xs"')
  })

  it('never rewrites identifiers, line comments, JSX comments or prose', () => {
    const src = [
      'const edge = 1',
      '// bg-surface and neo-card',
      '{/* neo-card bg-hud */}',
      "const msg = 'the hud is fine'",
    ].join('\n')
    expect(run(src).code).toBe(src)
  })

  it('rewrites class names inside template literals', () => {
    expect(run('`${a} bg-hud`').code).toBe('`${a} bg-paper`')
  })

  it('keeps third-party brand hex verbatim and unflagged', () => {
    const r = run("const g = '#EA4335'")
    expect(r.code).toBe("const g = '#EA4335'")
    expect(r.flagged).toEqual([])
  })

  it('flags a hex with no safe mapping instead of guessing', () => {
    const r = run("const c = '#123ABC'")
    expect(r.code).toBe("const c = '#123ABC'")
    expect(r.flagged).toEqual([{ line: 1, kind: 'hex', text: '#123ABC' }])
  })

  it('turns mapped hex in code into CSS variables, in any case and in compound values', () => {
    expect(run("const a = '#8a4a70'").code).toBe("const a = 'var(--color-brand)'")
    expect(run("border: '3px solid #c8a96e'").code).toBe("border: '3px solid var(--color-line-soft)'")
    expect(run('<path fill="#fff" />').code).toBe('<path fill="var(--color-paper)" />')
  })

  it('keeps text readable when a background-only colour was used as text', () => {
    expect(run('"text-[#D99B3B]"').code).toBe('"text-warn-strong"')
    expect(run('"bg-[#D99B3B]"').code).toBe('"bg-warn"')
    expect(run('"text-[#7EA04A]"').code).toBe('"text-good-strong"')
  })

  it('is idempotent', () => {
    const once = run('"neo-btn bg-surface text-[10px] border-edge"').code
    expect(run(once).code).toBe(once)
    expect(run(once).changes).toEqual([])
  })

  it('exposes maps that only target tokens that exist in the theme', () => {
    expect(Object.values(NEO_MAP).every((v) => v.startsWith('px-'))).toBe(true)
    expect(TOKEN_MAP.surface).toBe('paper')
    expect(HEX_MAP['#3D2B1F']).toBe('ink')
    expect(THIRD_PARTY_HEX).toContain('#EA4335')
  })
})
