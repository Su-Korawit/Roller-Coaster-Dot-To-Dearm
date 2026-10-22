import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import fixtures from '../src/room/focusRulesFixtures.json'

const require = createRequire(import.meta.url)
const mod = require('./leavesMath.js')

describe('leavesMath (server)', () => {
  it.each(fixtures.map((f, i) => [`${f.fn} #${i}`, f]))('%s', (_n, f) => {
    expect(mod[f.fn](f.input)).toEqual(f.output)
  })

  it('exposes the limits', () => {
    expect(mod.MODES).toEqual(['strict', 'flexible'])
    expect(mod.PLANNED_MIN).toEqual({ min: 10, max: 120 })
  })
})
