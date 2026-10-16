import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import fixtures from '../src/content/publishFixtures.json'

const require = createRequire(import.meta.url)
const { validateDraftForPublish, planPublish, planUnpublish, resolveSlug, readingMinutes } = require('./articleLogic.js')

const valid = fixtures[0].draft
const NOW = { stamp: 'now' }
const base = (over = {}) => ({
  draftId: 'd1',
  uid: 'alice',
  isSuperAdmin: false,
  existingLive: null,
  now: NOW,
  ...over,
  draft: { ...valid, authorUid: 'alice', authorName: 'Alice', ...(over.draft ?? {}) },
})
const code = (fn) => {
  try {
    fn()
  } catch (e) {
    return e
  }
  return null
}

describe('planPublish', () => {
  it('builds the live document and the draft patch for a first publish', () => {
    const plan = planPublish(base())
    expect(plan.slug).toBe('medicine-all-projects')
    expect(plan.liveDoc).toMatchObject({
      title: valid.title,
      excerpt: valid.excerpt,
      category: 'compare',
      coverUrl: valid.coverUrl,
      authorUid: 'alice',
      authorName: 'Alice',
      draftId: 'd1',
      publishedAt: NOW,
      updatedAt: NOW,
    })
    expect(plan.liveDoc.readingMinutes).toBeGreaterThanOrEqual(1)
    expect(plan.draftPatch).toEqual({ publishedSlug: 'medicine-all-projects', publishedAt: NOW, updatedAt: NOW, isLive: true })
  })

  it('lets only the author or the super-admin publish', () => {
    expect(code(() => planPublish(base({ uid: 'mallory' })))?.code).toBe('permission-denied')
    expect(planPublish(base({ uid: 'root', isSuperAdmin: true })).slug).toBe('medicine-all-projects')
  })

  it('refuses a slug that another draft already owns', () => {
    const err = code(() => planPublish(base({ existingLive: { draftId: 'other', publishedAt: 'old' } })))
    expect(err?.code).toBe('already-exists')
  })

  it('republishes in place: keeps publishedAt and the original slug', () => {
    const plan = planPublish(
      base({
        draft: { slug: 'changed-slug', publishedSlug: 'medicine-all-projects' },
        existingLive: { draftId: 'd1', publishedAt: 'first-time' },
      }),
    )
    expect(plan.slug).toBe('medicine-all-projects')
    expect(plan.liveDoc.publishedAt).toBe('first-time')
    expect(plan.draftPatch.publishedSlug).toBe('medicine-all-projects')
  })

  it('republishes after an unpublish (no live doc yet) with a fresh publishedAt', () => {
    const plan = planPublish(base({ draft: { publishedSlug: 'medicine-all-projects' }, existingLive: null }))
    expect(plan.liveDoc.publishedAt).toBe(NOW)
  })

  it('fails with the validation errors for an incomplete draft', () => {
    const err = code(() => planPublish(base({ draft: { excerpt: '' } })))
    expect(err?.code).toBe('failed-precondition')
    expect(err.errors).toEqual([{ field: 'excerpt', code: 'required' }])
  })

  it('rejects a missing draft', () => {
    expect(code(() => planPublish({ ...base(), draft: null }))?.code).toBe('failed-precondition')
  })

  it('defaults optional fields', () => {
    const plan = planPublish(base({ draft: { tags: undefined, seo: undefined, authorName: undefined } }))
    expect(plan.liveDoc.tags).toEqual([])
    expect(plan.liveDoc.seo).toBeNull()
    expect(plan.liveDoc.authorName).toBe('')
  })
})

describe('planUnpublish', () => {
  it('lets the author or the super-admin unpublish', () => {
    expect(() => planUnpublish({ live: { authorUid: 'alice' }, uid: 'alice', isSuperAdmin: false })).not.toThrow()
    expect(() => planUnpublish({ live: { authorUid: 'alice' }, uid: 'root', isSuperAdmin: true })).not.toThrow()
  })

  it('rejects a stranger and a missing article', () => {
    expect(code(() => planUnpublish({ live: { authorUid: 'alice' }, uid: 'mallory', isSuperAdmin: false }))?.code).toBe('permission-denied')
    expect(code(() => planUnpublish({ live: null, uid: 'alice', isSuperAdmin: false }))?.code).toBe('failed-precondition')
  })
})

describe('helpers', () => {
  it('resolveSlug prefers the published slug', () => {
    expect(resolveSlug({ slug: 'new', publishedSlug: 'old' })).toBe('old')
    expect(resolveSlug({ slug: 'new' })).toBe('new')
    expect(resolveSlug({})).toBe('')
  })

  it('readingMinutes is at least 1 and tolerates bad input', () => {
    expect(readingMinutes(null)).toBe(1)
  })
})

describe('validateDraftForPublish', () => {
  it('accepts the base valid fixture', () => {
    expect(validateDraftForPublish(valid)).toEqual({ ok: true, errors: [] })
  })
})
