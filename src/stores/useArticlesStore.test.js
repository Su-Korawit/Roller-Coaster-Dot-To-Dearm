import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_, ...path) => ({ _col: path.join('/') })),
  doc: vi.fn((_, ...path) => ({ _path: path.join('/') })),
  query: vi.fn((col) => ({ _query: col })),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
}))

const { useArticlesStore } = await import('./useArticlesStore')
const { getDocs, getDoc } = await import('firebase/firestore')

const snap = (id, data) => ({ id, data: () => data })

beforeEach(() => {
  useArticlesStore.setState({ summaries: [], config: null, loading: false, error: null })
  vi.clearAllMocks()
})

describe('loadHome', () => {
  it('fills summaries (without bodies) and the hub config', async () => {
    getDocs.mockResolvedValue({
      docs: [snap('a1', { title: 'หนึ่ง', category: 'news', body: 'HUGE', excerpt: 'e', publishedAt: '2026-10-01T00:00:00.000Z' })],
    })
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ lineOpenChatUrl: 'https://line.me/ti/g2/x' }) })

    await useArticlesStore.getState().loadHome()

    const s = useArticlesStore.getState()
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
    expect(s.summaries).toHaveLength(1)
    expect(s.summaries[0]).toMatchObject({ slug: 'a1', title: 'หนึ่ง', category: 'news' })
    expect(s.summaries[0].body).toBeUndefined()
    expect(s.config).toEqual({ lineOpenChatUrl: 'https://line.me/ti/g2/x' })
  })

  it('uses a null config when the document does not exist', async () => {
    getDocs.mockResolvedValue({ docs: [] })
    getDoc.mockResolvedValue({ exists: () => false })
    await useArticlesStore.getState().loadHome()
    expect(useArticlesStore.getState().config).toBeNull()
  })

  it('records the error and stops loading when a read fails', async () => {
    getDocs.mockRejectedValue(new Error('offline'))
    getDoc.mockResolvedValue({ exists: () => false })
    await useArticlesStore.getState().loadHome()
    const s = useArticlesStore.getState()
    expect(s.loading).toBe(false)
    expect(s.error).toBeInstanceOf(Error)
    expect(s.summaries).toEqual([])
  })
})

describe('loadArticle', () => {
  it('returns the article with its slug', async () => {
    getDoc.mockResolvedValue({ exists: () => true, id: 'my-slug', data: () => ({ title: 'T', body: '{}' }) })
    expect(await useArticlesStore.getState().loadArticle('my-slug')).toEqual({ slug: 'my-slug', title: 'T', body: '{}' })
  })

  it('returns null for a missing article', async () => {
    getDoc.mockResolvedValue({ exists: () => false })
    expect(await useArticlesStore.getState().loadArticle('nope')).toBeNull()
  })
})
