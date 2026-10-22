import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import * as client from './focusRules'
import fixtures from './focusRulesFixtures.json'

const require = createRequire(import.meta.url)
const server = require('../../functions/leavesMath.js')

describe('focusRules (client)', () => {
  it.each(fixtures.map((f, i) => [`${f.fn} #${i}`, f]))('%s', (_n, f) => {
    expect(client[f.fn](f.input)).toEqual(f.output)
  })

  it('exports the same functions and limits as the server module', () => {
    for (const name of ['leavesFor', 'treeFor', 'validateFocusParams', 'practiceLeaves']) expect(typeof client[name]).toBe('function')
    expect(client.MODES).toEqual(server.MODES)
    expect(client.PLANNED_MIN).toEqual(server.PLANNED_MIN)
    expect(client.PRACTICE).toEqual(server.PRACTICE)
  })
})
