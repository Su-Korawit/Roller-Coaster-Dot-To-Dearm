import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  hydrateSelect: vi.fn(),
  hydratePortfolio: vi.fn(),
  setPortfolioSyncUser: vi.fn(),
  hydrateTasks: vi.fn(),
  setTaskSyncUser: vi.fn(),
  hydrateRoadmap: vi.fn(),
  setRoadmapSyncUser: vi.fn(),
  hydrateMap: vi.fn(),
  armMapSync: vi.fn(),
  disarmMapSync: vi.fn(),
  hydrateInventory: vi.fn(),
  setInventorySyncUser: vi.fn(),
  disarmInventorySync: vi.fn(),
  hydrateFarm: vi.fn(),
  armFarmSync: vi.fn(),
  disarmFarmSync: vi.fn(),
  setCoins: vi.fn(),
  setMapOwner: vi.fn(),
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
vi.mock('../stores/useWorldStore', () => ({
  useWorldStore: { getState: () => ({ setMapOwner: m.setMapOwner }) },
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
  hydrateMapFromFirestore: (...a) => m.hydrateMap(...a),
  armMapSync: (...a) => m.armMapSync(...a),
  disarmMapSync: (...a) => m.disarmMapSync(...a),
  hydrateInventoryFromFirestore: (...a) => m.hydrateInventory(...a),
  setInventorySyncUser: (...a) => m.setInventorySyncUser(...a),
  disarmInventorySync: (...a) => m.disarmInventorySync(...a),
  hydrateFarmFromFirestore: (...a) => m.hydrateFarm(...a),
  armFarmSync: (...a) => m.armFarmSync(...a),
  disarmFarmSync: (...a) => m.disarmFarmSync(...a),
}))

const { bootstrapSession, teardownSession } = await import('./sessionBootstrap')

describe('bootstrapSession', () => {
  beforeEach(() => {
    vi.resetAllMocks()
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

  it('hydrates the Personal Map on login', async () => {
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateMap).toHaveBeenCalledWith('u1')
  })

  it('keeps hydrating later stores when map hydration throws', async () => {
    m.hydrateMap.mockRejectedValue(new Error('map boom'))
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateRoadmap).toHaveBeenCalledWith('u1')
  })

  it('hydrates inventory and arms its sync writer on login', async () => {
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateInventory).toHaveBeenCalledWith('u1')
    expect(m.setInventorySyncUser).toHaveBeenCalledWith('u1')
  })

  it('hydrates farm and arms its sync writer on login', async () => {
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateFarm).toHaveBeenCalledWith('u1')
    expect(m.armFarmSync).toHaveBeenCalledWith('u1')
  })

  it('keeps hydrating farm even when inventory hydration throws', async () => {
    m.hydrateInventory.mockRejectedValue(new Error('inventory boom'))
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateFarm).toHaveBeenCalledWith('u1')
  })

  it('keeps arming inventory sync even when farm hydration throws', async () => {
    m.hydrateFarm.mockRejectedValueOnce(new Error('farm err'))
    await bootstrapSession({ uid: 'u1' })
    expect(m.setInventorySyncUser).toHaveBeenCalledWith('u1')  // still armed
    expect(m.armFarmSync).not.toHaveBeenCalled()               // farm sync not armed
  })

  it('sets the current map owner to own uid and arms the map sync writer', async () => {
    await bootstrapSession({ uid: 'u1' })
    expect(m.setMapOwner).toHaveBeenCalledWith('u1')
    expect(m.armMapSync).toHaveBeenCalledWith('u1')
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

  it('disarms the map sync writer and clears the map owner on logout', () => {
    teardownSession()
    expect(m.disarmMapSync).toHaveBeenCalled()
    expect(m.setMapOwner).toHaveBeenCalledWith(null)
  })

  it('disarms inventory and farm sync writers on logout', () => {
    teardownSession()
    expect(m.disarmInventorySync).toHaveBeenCalled()
    expect(m.disarmFarmSync).toHaveBeenCalled()
  })
})
