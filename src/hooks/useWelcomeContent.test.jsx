// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('../lib/db', () => ({
  refs: { welcomeGamePreview: () => 'gp', welcomeStats: () => 'st' },
  cols: { welcomeNews: 'news', welcomeFaq: 'faq', welcomeTestimonials: 'tst' },
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
    getDocs
      .mockResolvedValueOnce(snapList([{ id: 'n1', titleTh: 'ข่าว', bodyTh: 'เนื้อหา' }]))
      .mockResolvedValueOnce(snapList([{ id: 'f1', q: 'ถาม', a: 'ตอบ', order: 0 }]))
      .mockResolvedValueOnce(snapList([{ id: 't1', name: 'A', role: 'ม.6', quote: 'ดีมาก' }]))

    const { result } = renderHook(() => useWelcomeContent())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.gamePreview).toEqual({ mediaUrl: 'g.gif', mediaType: 'gif' })
    expect(result.current.stats).toEqual([{ label: 'Users', value: '1.2k+' }])
    expect(result.current.news).toEqual([{ id: 'n1', titleTh: 'ข่าว', bodyTh: 'เนื้อหา' }])
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
})
