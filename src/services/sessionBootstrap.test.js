import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  hydrateSelect: vi.fn(),
  hydratePortfolio: vi.fn(),
  setPortfolioSyncUser: vi.fn(),
  hydrateTasks: vi.fn(),
  setTaskSyncUser: vi.fn(),
  hydrateRoadmap: vi.fn(),
  setRoadmapSyncUser: vi.fn(),
  setCoins: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getDoc: (...a) => m.getDoc(...a),
  setDoc: (...a) => m.setDoc(...a),
}))
vi.mock('../lib/db', () => ({
  refs: { user: (uid) => ({ _path: `users/${uid}` }) },
  shapes: { initialUser: () => ({}) },
}))
vi.mock('../stores/useUserStore', () => ({
  useUserStore: { getState: () => ({ setCoins: m.setCoins }) },
}))
vi.mock('../utils/syncSelectToFirestore', () => ({
  hydrateSelectStoreFromFirestore: (...a) => m.hydrateSelect(...a),
}))
vi.mock('../lib/syncManager', () => ({
  hydratePortfolioFromFirestore: (...a) => m.hydratePortfolio(...a),
  setPortfolioSyncUser: (...a) => m.setPortfolioSyncUser(...a),
  hydrateTasksFromFirestore: (...a) => m.hydrateTasks(...a),
  setTaskSyncUser: (...a) => m.setTaskSyncUser(...a),
  hydrateRoadmapFromFirestore: (...a) => m.hydrateRoadmap(...a),
  setRoadmapSyncUser: (...a) => m.setRoadmapSyncUser(...a),
}))

const { bootstrapSession, teardownSession } = await import('./sessionBootstrap')

describe('bootstrapSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ coins: 0 }) })
  })

  it('keeps hydrating later stores when an earlier hydration throws', async () => {
    m.hydratePortfolio.mockRejectedValue(new Error('portfolio boom'))

    await bootstrapSession({ uid: 'u1' })

    expect(m.hydrateTasks).toHaveBeenCalledWith('u1')
    expect(m.setTaskSyncUser).toHaveBeenCalledWith('u1')
    expect(m.hydrateRoadmap).toHaveBeenCalledWith('u1')
    expect(m.setRoadmapSyncUser).toHaveBeenCalledWith('u1')
  })
})

describe('teardownSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stops every debounced sync writer by passing null', () => {
    teardownSession()
    expect(m.setPortfolioSyncUser).toHaveBeenCalledWith(null)
    expect(m.setTaskSyncUser).toHaveBeenCalledWith(null)
    expect(m.setRoadmapSyncUser).toHaveBeenCalledWith(null)
  })
})
