import { describe, it, expect } from 'vitest'
import { toSummary, toMillis, groupByCategory, searchSummaries, relatedTo } from './listing'

const make = (slug, over = {}) => ({
  slug,
  title: `เรื่อง ${slug}`,
  excerpt: `สรุป ${slug}`,
  category: 'news',
  tags: [],
  coverUrl: 'https://x.org/c.png',
  coverAlt: 'ปก',
  authorName: 'A',
  publishedAt: '2026-10-01T00:00:00.000Z',
  readingMinutes: 2,
  ...over,
})

describe('toMillis', () => {
  it('reads ISO strings, Dates, numbers and Firestore-like timestamps', () => {
    expect(toMillis('2026-10-01T00:00:00.000Z')).toBe(Date.parse('2026-10-01T00:00:00.000Z'))
    expect(toMillis(new Date(5))).toBe(5)
    expect(toMillis(7)).toBe(7)
    expect(toMillis({ toMillis: () => 9 })).toBe(9)
    expect(toMillis({ seconds: 2, nanoseconds: 0 })).toBe(2000)
  })

  it('treats missing or invalid values as 0', () => {
    expect(toMillis(undefined)).toBe(0)
    expect(toMillis('nonsense')).toBe(0)
  })
})

describe('toSummary', () => {
  it('keeps only the list fields and uses id as the slug fallback', () => {
    const s = toSummary({ id: 'abc', title: 'T', excerpt: 'E', category: 'guide', body: 'HUGE', authorUid: 'u', extra: 1 })
    expect(s).toEqual({
      slug: 'abc',
      title: 'T',
      excerpt: 'E',
      category: 'guide',
      tags: [],
      coverUrl: '',
      coverAlt: '',
      authorName: '',
      publishedAt: null,
      readingMinutes: 1,
    })
  })
})

describe('groupByCategory', () => {
  it('sorts each category newest first and caps it', () => {
    const list = [
      make('old', { publishedAt: '2026-01-01T00:00:00.000Z' }),
      make('new', { publishedAt: '2026-10-01T00:00:00.000Z' }),
      make('mid', { publishedAt: '2026-05-01T00:00:00.000Z' }),
      make('older', { publishedAt: '2025-12-01T00:00:00.000Z' }),
      make('g1', { category: 'guide' }),
    ]
    const g = groupByCategory(list, 3)
    expect(g.news.map((a) => a.slug)).toEqual(['new', 'mid', 'old'])
    expect(g.guide.map((a) => a.slug)).toEqual(['g1'])
    expect(g.camps).toEqual([])
  })

  it('ignores articles with an unknown category', () => {
    expect(groupByCategory([make('x', { category: 'sports' })]).news).toEqual([])
  })
})

describe('searchSummaries', () => {
  const list = [
    make('a', { title: 'แพทย์ จุฬาฯ ทุกโครงการ', tags: ['แพทย์'] }),
    make('b', { title: 'วิศวะ', excerpt: 'เทียบโครงการวิศวะ', tags: ['Engineering'] }),
    make('c', { title: 'ค่ายฤดูร้อน' }),
  ]

  it('matches title, excerpt and tags, case-insensitively', () => {
    expect(searchSummaries(list, 'แพทย์').map((a) => a.slug)).toEqual(['a'])
    expect(searchSummaries(list, 'วิศวะ').map((a) => a.slug)).toEqual(['b'])
    expect(searchSummaries(list, 'ENGINEERING').map((a) => a.slug)).toEqual(['b'])
  })

  it('returns nothing for an empty or blank query', () => {
    expect(searchSummaries(list, '')).toEqual([])
    expect(searchSummaries(list, '   ')).toEqual([])
    expect(searchSummaries(list, undefined)).toEqual([])
  })

  it('returns an empty list when nothing matches', () => {
    expect(searchSummaries(list, 'ไม่มีแน่นอน')).toEqual([])
  })
})

describe('relatedTo', () => {
  const list = [
    make('self', { category: 'guide' }),
    make('g-new', { category: 'guide', publishedAt: '2026-10-05T00:00:00.000Z' }),
    make('g-old', { category: 'guide', publishedAt: '2026-01-05T00:00:00.000Z' }),
    make('n-1', { category: 'news', publishedAt: '2026-10-09T00:00:00.000Z' }),
  ]

  it('excludes the article itself and prefers the same category', () => {
    expect(relatedTo(list, { slug: 'self', category: 'guide' }, 3).map((a) => a.slug)).toEqual(['g-new', 'g-old', 'n-1'])
  })

  it('caps the result', () => {
    expect(relatedTo(list, { slug: 'self', category: 'guide' }, 1).map((a) => a.slug)).toEqual(['g-new'])
  })
})
