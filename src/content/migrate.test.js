import { describe, it, expect } from 'vitest'
import { welcomeNewsToArticle, planMigration } from './migrate'
import { parseBody, plainText } from './renderBody'
import { validateDraftForPublish } from './validatePublish'
import { LIMITS } from './schema'

const author = { authorUid: 'root', authorName: 'ผู้พัฒนาระบบ' }
const NOW = new Date('2026-10-16T00:00:00.000Z')
const old = (over = {}) => ({
  titleTh: 'ประกาศผลสอบ',
  bodyTh: 'บรรทัดแรก\n\nบรรทัดที่สอง',
  coverUrl: 'https://x.org/c.png',
  createdAt: { toDate: () => new Date('2026-09-01T03:00:00.000Z') },
  ...over,
})

describe('welcomeNewsToArticle', () => {
  const { article, draft } = welcomeNewsToArticle(old(), 'abc123XYZ', { ...author, now: NOW })

  it('keeps the old id as the slug and files it under news', () => {
    expect(article.category).toBe('news')
    expect(draft.slug).toBe('abc123XYZ')
    expect(draft.publishedSlug).toBe('abc123XYZ')
    expect(article.draftId).toBe('legacy-abc123XYZ')
  })

  it('turns each non-empty line into a paragraph', () => {
    const doc = parseBody(article.body)
    expect(doc.content.map((n) => n.type)).toEqual(['paragraph', 'paragraph'])
    expect(plainText(doc)).toBe('บรรทัดแรก บรรทัดที่สอง')
  })

  it('carries title, cover, author and the original publish date', () => {
    expect(article).toMatchObject({
      title: 'ประกาศผลสอบ',
      coverUrl: 'https://x.org/c.png',
      coverAlt: 'ประกาศผลสอบ',
      authorUid: 'root',
      authorName: 'ผู้พัฒนาระบบ',
      tags: [],
    })
    expect(article.publishedAt).toEqual(new Date('2026-09-01T03:00:00.000Z'))
    expect(article.updatedAt).toEqual(article.publishedAt)
    expect(article.readingMinutes).toBe(1)
  })

  it('writes a draft that mirrors the live article so the Studio can edit it', () => {
    for (const k of ['title', 'excerpt', 'category', 'coverUrl', 'coverAlt', 'body', 'authorUid']) {
      expect(draft[k]).toEqual(article[k])
    }
    expect(Object.keys(draft).sort()).toEqual(
      ['authorName', 'authorUid', 'body', 'category', 'coverAlt', 'coverUrl', 'createdAt', 'excerpt', 'publishedAt', 'publishedSlug', 'seo', 'slug', 'tags', 'title', 'updatedAt'],
    )
  })

  it('passes the publish checks when the old post had a cover', () => {
    expect(validateDraftForPublish(draft).ok).toBe(true)
  })

  it('caps the excerpt at 160 characters and collapses whitespace', () => {
    const long = welcomeNewsToArticle(old({ bodyTh: `${'ก'.repeat(100)}\n   ${'ข'.repeat(100)}` }), 'abc', { ...author, now: NOW })
    expect(long.article.excerpt.length).toBeLessThanOrEqual(LIMITS.excerptMax)
    expect(long.article.excerpt).not.toMatch(/\s{2,}/)
  })

  it('falls back to the title when the body is empty, and tolerates a missing cover or date', () => {
    const bare = welcomeNewsToArticle({ titleTh: 'หัวข้อเดียว' }, 'abc', { ...author, now: NOW })
    expect(bare.article.excerpt).toBe('หัวข้อเดียว')
    expect(plainText(parseBody(bare.article.body))).toBe('หัวข้อเดียว')
    expect(bare.article.coverUrl).toBe('')
    expect(bare.article.publishedAt).toEqual(NOW)
  })

  it('accepts ISO strings and millisecond numbers as dates', () => {
    expect(welcomeNewsToArticle(old({ createdAt: '2026-08-01T00:00:00.000Z' }), 'abc', { ...author, now: NOW }).article.publishedAt).toEqual(new Date('2026-08-01T00:00:00.000Z'))
    expect(welcomeNewsToArticle(old({ createdAt: 1000 }), 'abc', { ...author, now: NOW }).article.publishedAt).toEqual(new Date(1000))
  })

  it('is deterministic: the same input gives the same documents', () => {
    const again = welcomeNewsToArticle(old(), 'abc123XYZ', { ...author, now: NOW })
    expect(again).toEqual({ article, draft })
  })
})

describe('planMigration', () => {
  const docs = [
    { id: 'goodOne1', ...old() },
    { id: 'goodTwo2', ...old({ titleTh: 'สอง' }) },
    { id: 'taken123', ...old() },
    { id: 'bad slug!', ...old() },
    { id: 'huge12345', ...old({ bodyTh: 'x'.repeat(LIMITS.bodyMaxBytes + 10) }) },
  ]
  const plan = planMigration(new Set(['taken123']), docs, { ...author, now: NOW })

  it('creates only new, valid articles', () => {
    expect(plan.toCreate.map((c) => c.id)).toEqual(['goodOne1', 'goodTwo2'])
  })

  it('reports why each other post was skipped', () => {
    expect(plan.skipped).toEqual([
      { id: 'taken123', reason: 'already_exists' },
      { id: 'bad slug!', reason: 'invalid_slug' },
      { id: 'huge12345', reason: 'body_too_large' },
    ])
  })

  it('is idempotent: planning again after creating yields nothing new', () => {
    const second = planMigration(new Set(['taken123', 'goodOne1', 'goodTwo2']), docs, { ...author, now: NOW })
    expect(second.toCreate).toEqual([])
  })

  it('carries ready-to-write article and draft documents', () => {
    expect(plan.toCreate[0].article.title).toBe('ประกาศผลสอบ')
    expect(plan.toCreate[0].draft.publishedSlug).toBe('goodOne1')
  })
})
