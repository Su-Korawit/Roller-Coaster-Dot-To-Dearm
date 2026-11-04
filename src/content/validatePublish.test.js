import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import fixtures from './publishFixtures.json'
import { validateDraftForPublish } from './validatePublish'
import { CATEGORY_IDS, LIMITS } from './schema'

const require = createRequire(import.meta.url)
const server = require('../../functions/articleLogic.js')

const hydrate = (draft) =>
  draft.body === '__LARGE__'
    ? {
        ...draft,
        body: JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(LIMITS.bodyMaxBytes + 1) }] }],
        }),
      }
    : draft

const key = (e) => `${e.field}:${e.code}`
const keys = (errors) => errors.map(key).sort()

describe('validateDraftForPublish (client)', () => {
  it.each(fixtures)('$name', ({ draft, expectedErrors }) => {
    const result = validateDraftForPublish(hydrate(draft))
    expect(keys(result.errors)).toEqual(keys(expectedErrors))
    expect(result.ok).toBe(expectedErrors.length === 0)
  })
})

describe('client / functions parity', () => {
  it.each(fixtures)('same errors on the server: $name', ({ draft }) => {
    const d = hydrate(draft)
    expect(keys(validateDraftForPublish(d).errors)).toEqual(keys(server.validateDraftForPublish(d).errors))
  })

  it('shares categories and limits with the schema', () => {
    expect(server.CATEGORY_IDS).toEqual(CATEGORY_IDS)
    expect(server.LIMITS).toEqual(LIMITS)
  })

  it('shares the slug rule', () => {
    for (const slug of ['ab', 'abc', 'a-b_c', '-ab', 'a'.repeat(80), 'a'.repeat(81), 'has space', 'คณะ']) {
      const draft = { ...fixtures[0].draft, slug }
      const a = validateDraftForPublish(draft).errors.some((e) => e.field === 'slug')
      const b = server.validateDraftForPublish(draft).errors.some((e) => e.field === 'slug')
      expect(a).toBe(b)
    }
  })
})
