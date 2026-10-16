// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('../lib/db', () => ({
  refs: { welcomeGamePreview: () => 'gp', welcomeStats: () => 'st' },
  cols: { welcomeFaq: 'faq', welcomeTestimonials: 'tst' },
  queries: { publishedArticles: (n) => `articles:${n}` },
}))
vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((c) => c),
  orderBy: vi.fn(),
}))

const { getDoc, getDocs } = await import('firebase/firestore')
const { useWelcomeContent } = await import('./useWelcomeContent')

const snapDoc = (data) => ({ exists: () => data != null, data: () => data })
const snapList = (rows) => ({ docs: rows.map((r) => ({ id: r.id, data: () => r })) })

describe('useWelcomeContent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads and shapes all five content areas', async () => {
    getDoc
      .mockResolvedValueOnce(snapDoc({ mediaUrl: 'g.gif', mediaType: 'gif' }))   // gamePreview
      .mockResolvedValueOnce(snapDoc({ items: [{ label: 'Users', value: '1.2k+' }] })) // stats
    getDocs.mockImplementation(async (q) => {
      if (q === 'articles:60') return snapList([{ id: 'n1', title: 'ข่าว', excerpt: 'สรุป', category: 'news', publishedAt: 1 }])
      if (q === 'faq') return snapList([{ id: 'f1', q: 'ถาม', a: 'ตอบ', order: 0 }])
      return snapList([{ id: 't1', name: 'A', role: 'ม.6', quote: 'ดีมาก' }])
    })

    const { result } = renderHook(() => useWelcomeContent())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.gamePreview).toEqual({ mediaUrl: 'g.gif', mediaType: 'gif' })
    expect(result.current.stats).toEqual([{ label: 'Users', value: '1.2k+' }])
    expect(result.current.news).toHaveLength(1)
    expect(result.current.news[0]).toMatchObject({ slug: 'n1', title: 'ข่าว', excerpt: 'สรุป' })
    expect(result.current.faq[0].q).toBe('ถาม')
    expect(result.current.testimonials[0].name).toBe('A')
  })

  it('degrades to empty defaults on read error', async () => {
    getDoc.mockRejectedValue(new Error('offline'))
    getDocs.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useWelcomeContent())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.gamePreview).toBeNull()
    expect(result.current.stats).toEqual([])
    expect(result.current.news).toEqual([])
  })

  it('shows at most 3 news articles, newest first, ignoring other categories', async () => {
    getDoc.mockResolvedValue(snapDoc(null))
    const rows = [
      { id: 'a', category: 'news', publishedAt: 1 },
      { id: 'b', category: 'guide', publishedAt: 9 },
      { id: 'c', category: 'news', publishedAt: 4 },
      { id: 'd', category: 'news', publishedAt: 3 },
      { id: 'e', category: 'news', publishedAt: 2 },
    ]
    getDocs.mockImplementation(async (q) => (q === 'articles:60' ? snapList(rows) : snapList([])))
    const { result } = renderHook(() => useWelcomeContent())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.news.map((n) => n.slug)).toEqual(['c', 'd', 'e'])
  })

  it('keeps the rest of the page when only the articles read fails', async () => {
    getDoc.mockResolvedValue(snapDoc({ items: [{ label: 'Users', value: '1' }] }))
    getDocs.mockImplementation(async (q) => {
      if (q === 'articles:60') throw new Error('denied')
      return snapList([{ id: 'f1', q: 'ถาม', a: 'ตอบ', order: 0 }])
    })
    const { result } = renderHook(() => useWelcomeContent())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.news).toEqual([])
    expect(result.current.faq[0].q).toBe('ถาม')
  })
})
