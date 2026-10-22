import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  hydratePortfolio: vi.fn(),
  setPortfolioSyncUser: vi.fn(),
  hydrateTasks: vi.fn(),
  setTaskSyncUser: vi.fn(),
  armRoadmapSheetSync: vi.fn(),
  disarmRoadmapSheetSync: vi.fn(),
  hydrateMap: vi.fn(),
  armMapSync: vi.fn(),
  disarmMapSync: vi.fn(),
  hydrateInventory: vi.fn(),
  setInventorySyncUser: vi.fn(),
  disarmInventorySync: vi.fn(),
  hydrateFarm: vi.fn(),
  armFarmSync: vi.fn(),
  disarmFarmSync: vi.fn(),
  hydrateSchool: vi.fn(),
  setSchoolSyncUser: vi.fn(),
  disarmSchoolSync: vi.fn(),
  hydrateEntitlements: vi.fn(),
  setCoins: vi.fn(),
  setFileBagUsageBytes: vi.fn(),
  setMapOwner: vi.fn(),
  resetPlans: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  hydrateFarmData: vi.fn(),
  hydrateSelect: vi.fn(),
  setRoadmapMyUid: vi.fn(),
  hydrateSheetsAction: vi.fn(),
  migrateLegacyRoadmap: vi.fn(),
  hydrateSpotify: vi.fn(),
  bootstrapStudyRoom: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getDoc: (...a) => m.getDoc(...a),
  getDocs: (...a) => m.getDocs(...a),
  setDoc: (...a) => m.setDoc(...a),
}))
vi.mock('../lib/farmDataSync', () => ({
  hydrateFarmDataFromFirestore: (...a) => m.hydrateFarmData(...a),
}))
vi.mock('../lib/db', () => ({
  refs: {
    user: (uid) => ({ _path: `users/${uid}` }),
    roadmapSheet: (id) => ({ _path: `roadmapSheets/${id}` }),
  },
  shapes: {
    initialUser: () => ({}),
    newRoadmapSheet: ({ ownerUid, name }) => ({
      ownerUid, name, nodes: [], edges: [], order: 0, collaborators: {}, collaboratorUids: [],
    }),
  },
  queries: {
    sheetsSharedWithMe: (uid) => ({ _query: `sheetsSharedWithMe(${uid})` }),
  },
}))
vi.mock('./studyRoomBootstrap', () => ({
  bootstrapStudyRoom: (...a) => m.bootstrapStudyRoom(...a),
}))
vi.mock('./spotifyConnect', () => ({
  hydrateSpotify: (...a) => m.hydrateSpotify(...a),
}))
vi.mock('../utils/migrateLegacyRoadmap', () => ({
  migrateLegacyRoadmap: (...a) => m.migrateLegacyRoadmap(...a),
}))
vi.mock('../stores/useUserStore', () => ({
  useUserStore: { getState: () => ({ setCoins: m.setCoins, setFileBagUsageBytes: m.setFileBagUsageBytes }) },
}))
vi.mock('../stores/useEntitlementsStore', () => ({
  useEntitlementsStore: { getState: () => ({ hydrateEntitlements: m.hydrateEntitlements }) },
}))
vi.mock('../stores/useWorldStore', () => ({
  useWorldStore: { getState: () => ({ setMapOwner: m.setMapOwner }) },
}))
vi.mock('../stores/useRoadmapStore', () => ({
  useRoadmapStore: { getState: () => ({ setRoadmapMyUid: m.setRoadmapMyUid, hydrateSheets: m.hydrateSheetsAction }) },
}))
vi.mock('../stores/usePlansStore', () => ({
  usePlansStore: { getState: () => ({ resetPlans: m.resetPlans }) },
}))
vi.mock('../utils/syncSelectToFirestore', () => ({
  hydrateSelectStoreFromFirestore: (...a) => m.hydrateSelect(...a),
}))
vi.mock('../lib/syncManager', () => ({
  hydratePortfolioFromFirestore: (...a) => m.hydratePortfolio(...a),
  setPortfolioSyncUser: (...a) => m.setPortfolioSyncUser(...a),
  hydrateTasksFromFirestore: (...a) => m.hydrateTasks(...a),
  setTaskSyncUser: (...a) => m.setTaskSyncUser(...a),
  armRoadmapSheetSync: (...a) => m.armRoadmapSheetSync(...a),
  disarmRoadmapSheetSync: (...a) => m.disarmRoadmapSheetSync(...a),
  hydrateMapFromFirestore: (...a) => m.hydrateMap(...a),
  armMapSync: (...a) => m.armMapSync(...a),
  disarmMapSync: (...a) => m.disarmMapSync(...a),
  hydrateInventoryFromFirestore: (...a) => m.hydrateInventory(...a),
  setInventorySyncUser: (...a) => m.setInventorySyncUser(...a),
  disarmInventorySync: (...a) => m.disarmInventorySync(...a),
  hydrateFarmFromFirestore: (...a) => m.hydrateFarm(...a),
  armFarmSync: (...a) => m.armFarmSync(...a),
  disarmFarmSync: (...a) => m.disarmFarmSync(...a),
  hydrateSchoolFromFirestore: (...a) => m.hydrateSchool(...a),
  setSchoolSyncUser: (...a) => m.setSchoolSyncUser(...a),
  disarmSchoolSync: (...a) => m.disarmSchoolSync(...a),
}))

const { bootstrapSession, teardownSession } = await import('./sessionBootstrap')

describe('bootstrapSession', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Default: existing user, already migrated, owns exactly sheet-1, no shares.
    m.getDoc.mockImplementation((ref) =>
      ref._path === 'users/u1'
        ? Promise.resolve({ exists: () => true, data: () => ({ coins: 0, roadmapSheetIds: ['sheet-1'] }) })
        : Promise.resolve({ exists: () => true, id: 'sheet-1', data: () => ({ ownerUid: 'u1', name: 'Roadmap', nodes: [], edges: [] }) }),
    )
    m.getDocs.mockResolvedValue({ docs: [] })
    m.setDoc.mockResolvedValue(undefined)
    m.hydrateFarmData.mockResolvedValue(undefined)
    m.hydrateSelect.mockResolvedValue(undefined)
    m.hydratePortfolio.mockResolvedValue(undefined)
    m.hydrateTasks.mockResolvedValue(undefined)
    m.hydrateMap.mockResolvedValue(undefined)
    m.hydrateInventory.mockResolvedValue(undefined)
    m.hydrateFarm.mockResolvedValue(undefined)
    m.hydrateSchool.mockResolvedValue(undefined)
    m.hydrateSpotify.mockResolvedValue(undefined)
    m.bootstrapStudyRoom.mockResolvedValue(undefined)
    m.migrateLegacyRoadmap.mockReturnValue(null)
  })

  it('keeps hydrating later stores when an earlier hydration throws', async () => {
    m.hydratePortfolio.mockRejectedValue(new Error('portfolio boom'))

    await bootstrapSession({ uid: 'u1' })

    expect(m.hydrateTasks).toHaveBeenCalledWith('u1')
    expect(m.setTaskSyncUser).toHaveBeenCalledWith('u1')
    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-1')
  })

  it('sets up the study room (balance, welcome pack, layout) on login', async () => {
    m.bootstrapStudyRoom.mockResolvedValue(undefined)
    await bootstrapSession({ uid: 'u1' })
    expect(m.bootstrapStudyRoom).toHaveBeenCalledWith('u1')
  })

  it('keeps hydrating the other stores when the study room setup throws', async () => {
    m.bootstrapStudyRoom.mockRejectedValue(new Error('room boom'))
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateTasks).toHaveBeenCalledWith('u1')
  })

  it('hydrates the Personal Map on login', async () => {
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateMap).toHaveBeenCalledWith('u1')
  })

  it('keeps hydrating later stores when map hydration throws', async () => {
    m.hydrateMap.mockRejectedValue(new Error('map boom'))
    await bootstrapSession({ uid: 'u1' })
    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-1')
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

  it('hydrates entitlements from the same user-doc read (empty default)', async () => {
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateEntitlements).toHaveBeenCalledWith({})
  })

  it('hydrates entitlements with the map when the user doc carries one', async () => {
    m.getDoc.mockImplementation((ref) =>
      ref._path === 'users/u1'
        ? Promise.resolve({ exists: () => true, data: () => ({ coins: 0, roadmapSheetIds: ['sheet-1'], entitlements: { 'pack-1': { kind: 'sticker-pack' } } }) })
        : Promise.resolve({ exists: () => true, id: 'sheet-1', data: () => ({ ownerUid: 'u1', name: 'Roadmap', nodes: [], edges: [] }) }),
    )
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateEntitlements).toHaveBeenCalledWith({ 'pack-1': { kind: 'sticker-pack' } })
  })

  it('hydrates school and arms its sync writer on login', async () => {
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateSchool).toHaveBeenCalledWith('u1')
    expect(m.setSchoolSyncUser).toHaveBeenCalledWith('u1')
  })

  it('keeps hydrating school even when farm hydration throws', async () => {
    m.hydrateFarm.mockRejectedValueOnce(new Error('farm boom'))
    await bootstrapSession({ uid: 'u1' })
    expect(m.hydrateSchool).toHaveBeenCalledWith('u1')
    expect(m.setSchoolSyncUser).toHaveBeenCalledWith('u1')
  })

  it('keeps arming inventory sync even when farm hydration throws', async () => {
    m.hydrateFarm.mockRejectedValueOnce(new Error('farm err'))
    await bootstrapSession({ uid: 'u1' })
    expect(m.setInventorySyncUser).toHaveBeenCalledWith('u1')
    expect(m.armFarmSync).not.toHaveBeenCalled()
  })

  it('sets the current map owner to own uid and arms the map sync writer', async () => {
    await bootstrapSession({ uid: 'u1' })
    expect(m.setMapOwner).toHaveBeenCalledWith('u1')
    expect(m.armMapSync).toHaveBeenCalledWith('u1')
  })

  it('reads the user doc exactly once for ensureUserDoc (coins come from that read)', async () => {
    m.getDoc.mockImplementation((ref) =>
      ref._path === 'users/u1'
        ? Promise.resolve({ exists: () => true, data: () => ({ coins: 42, roadmapSheetIds: ['sheet-1'] }) })
        : Promise.resolve({ exists: () => true, id: 'sheet-1', data: () => ({ ownerUid: 'u1', name: 'Roadmap', nodes: [], edges: [] }) }),
    )

    await bootstrapSession({ uid: 'u1' })

    const userDocReads = m.getDoc.mock.calls.filter(([ref]) => ref._path === 'users/u1')
    expect(userDocReads).toHaveLength(1)
    expect(m.setCoins).toHaveBeenCalledWith(42)
  })

  it('one failing hydration does not block the others', async () => {
    m.hydrateTasks.mockRejectedValueOnce(new Error('boom'))

    await bootstrapSession({ uid: 'u1' })

    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-1')
    expect(m.setTaskSyncUser).not.toHaveBeenCalled()
  })

  it('resolves and still hydrates entitlements even when setFileBagUsageBytes throws', async () => {
    m.setFileBagUsageBytes.mockImplementation(() => {
      throw new Error('bag boom')
    })

    await expect(bootstrapSession({ uid: 'u1' })).resolves.toBeUndefined()

    expect(m.hydrateEntitlements).toHaveBeenCalledWith({})
    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-1')
  })

  it('migrates the legacy roadmap field into sheet #1 when roadmapSheetIds is missing', async () => {
    m.getDoc.mockImplementation((ref) =>
      ref._path === 'users/u1'
        ? Promise.resolve({ exists: () => true, data: () => ({ coins: 0, roadmap: { nodes: [{ id: 'n1' }], edges: [] } }) })
        : Promise.resolve({ exists: () => true, id: 'new-sheet', data: () => ({ ownerUid: 'u1', name: 'Roadmap', nodes: [{ id: 'n1' }], edges: [] }) }),
    )
    m.migrateLegacyRoadmap.mockReturnValue({
      sheetId: 'new-sheet',
      sheetDoc: { ownerUid: 'u1', name: 'Roadmap', nodes: [{ id: 'n1' }], edges: [], order: 0, collaborators: {}, collaboratorUids: [] },
      userDocPatch: { roadmapSheetIds: ['new-sheet'] },
    })

    await bootstrapSession({ uid: 'u1' })

    expect(m.setDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/new-sheet' }, expect.objectContaining({ name: 'Roadmap' }))
    expect(m.setDoc).toHaveBeenCalledWith({ _path: 'users/u1' }, { roadmapSheetIds: ['new-sheet'] }, { merge: true })
    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('new-sheet')
  })

  it('seeds a fresh empty "Roadmap" sheet for a brand-new user with no legacy data', async () => {
    m.getDoc.mockImplementation((ref) =>
      ref._path === 'users/u1'
        ? Promise.resolve({ exists: () => true, data: () => ({ coins: 0 }) })
        : Promise.resolve({ exists: () => true, id: 'sheet-x', data: () => ({ ownerUid: 'u1', name: 'Roadmap', nodes: [], edges: [] }) }),
    )
    m.migrateLegacyRoadmap.mockReturnValue(null)

    await bootstrapSession({ uid: 'u1' })

    expect(m.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ _path: expect.stringMatching(/^roadmapSheets\//) }),
      expect.objectContaining({ name: 'Roadmap' }),
    )
    expect(m.hydrateSheetsAction).toHaveBeenCalled()
  })

  it('does not attempt migration again when roadmapSheetIds already exists', async () => {
    await bootstrapSession({ uid: 'u1' })

    const sheetWrites = m.setDoc.mock.calls.filter(([ref]) => ref._path?.startsWith('roadmapSheets/'))
    expect(sheetWrites).toHaveLength(0)
    expect(m.migrateLegacyRoadmap).not.toHaveBeenCalled()
  })

  it('hydrates owned sheets and shared-with-me sheets into the roadmap store, activating sheet #1', async () => {
    m.getDocs.mockResolvedValue({
      docs: [{ id: 'shared-1', data: () => ({ ownerUid: 'friend', name: 'Friend Sheet', nodes: [], edges: [], collaborators: { u1: 'edit' } }) }],
    })

    await bootstrapSession({ uid: 'u1' })

    expect(m.setRoadmapMyUid).toHaveBeenCalledWith('u1')
    const [sheetsArg, activeArg] = m.hydrateSheetsAction.mock.calls[0]
    expect(sheetsArg.map((s) => s.id)).toEqual(['sheet-1', 'shared-1'])
    expect(sheetsArg.find((s) => s.id === 'sheet-1').myRole).toBe('owner')
    expect(sheetsArg.find((s) => s.id === 'shared-1').myRole).toBe('edit')
    expect(activeArg).toBe('sheet-1')
    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-1')
  })

  it('activates and arms the first existing owned sheet when roadmapSheetIds[0] is stale', async () => {
    m.getDoc.mockImplementation((ref) => {
      if (ref._path === 'users/u1') {
        return Promise.resolve({ exists: () => true, data: () => ({ coins: 0, roadmapSheetIds: ['gone-sheet', 'sheet-2'] }) })
      }
      if (ref._path === 'roadmapSheets/gone-sheet') {
        return Promise.resolve({ exists: () => false })
      }
      if (ref._path === 'roadmapSheets/sheet-2') {
        return Promise.resolve({ exists: () => true, id: 'sheet-2', data: () => ({ ownerUid: 'u1', name: 'Roadmap', nodes: [], edges: [] }) })
      }
      return Promise.resolve({ exists: () => false })
    })

    await bootstrapSession({ uid: 'u1' })

    const [, activeArg] = m.hydrateSheetsAction.mock.calls[0]
    expect(activeArg).toBe('sheet-2')
    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-2')
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
  })

  it('disarms the roadmap sheet sync writer on logout', () => {
    teardownSession()
    expect(m.disarmRoadmapSheetSync).toHaveBeenCalled()
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

  it('clears persisted plans on logout', () => {
    teardownSession()
    expect(m.resetPlans).toHaveBeenCalledOnce()
  })
})
