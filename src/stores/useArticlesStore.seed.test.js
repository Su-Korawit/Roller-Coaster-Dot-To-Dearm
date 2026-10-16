// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: () => ({}),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
}))

const { useArticlesStore } = await import('./useArticlesStore')
const { getDocs, getDoc } = await import('firebase/firestore')

afterEach(() => vi.unstubAllEnvs())

beforeEach(() => {
  vi.clearAllMocks()
  useArticlesStore.setState({ summaries: [], config: null, loading: false, error: null })
})

describe('dev seed (VITE_CONTENT_SEED=1, development only)', () => {
  it('fills the store from local fixtures without touching Firestore', async () => {
    vi.stubEnv('VITE_CONTENT_SEED', '1')
    await useArticlesStore.getState().loadHome()
    const s = useArticlesStore.getState()
    expect(s.summaries.length).toBeGreaterThanOrEqual(8)
    expect(new Set(s.summaries.map((a) => a.category)).size).toBeGreaterThanOrEqual(4)
    expect(s.config.lineOpenChatUrl).toMatch(/^https:\/\/line\.me\//)
    expect(getDocs).not.toHaveBeenCalled()
    expect(getDoc).not.toHaveBeenCalled()
  })

  it('serves a seeded article body for loadArticle', async () => {
    vi.stubEnv('VITE_CONTENT_SEED', '1')
    await useArticlesStore.getState().loadHome()
    const slug = useArticlesStore.getState().summaries[0].slug
    const article = await useArticlesStore.getState().loadArticle(slug)
    expect(article.slug).toBe(slug)
    expect(JSON.parse(article.body).type).toBe('doc')
    expect(await useArticlesStore.getState().loadArticle('not-seeded')).toBeNull()
  })

  it('reads Firestore when the seed flag is absent', async () => {
    vi.stubEnv('VITE_CONTENT_SEED', '')
    getDocs.mockResolvedValue({ docs: [] })
    getDoc.mockResolvedValue({ exists: () => false })
    await useArticlesStore.getState().loadHome()
    expect(getDocs).toHaveBeenCalled()
  })
})
