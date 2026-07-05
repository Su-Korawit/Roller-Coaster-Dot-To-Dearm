import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Capture firebase mocks before hoisting ---
const setDoc = vi.fn()
const getDoc = vi.fn()

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  setDoc: (...args) => setDoc(...args),
  getDoc: (...args) => getDoc(...args),
  serverTimestamp: () => ({ _type: 'serverTimestamp' }),
}))
vi.mock('./db', () => ({
  refs: {
    user: (uid) => ({ _path: `users/${uid}` }),
    map:  (uid) => ({ _path: `maps/${uid}` }),
  },
}))

// Stub localStorage so Zustand persist doesn't blow up
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

const { useRoadmapStore } = await import('../stores/useRoadmapStore')
const { useTaskStore } = await import('../stores/useTaskStore')
const { useUserStore } = await import('../stores/useUserStore')
const { useWorldStore } = await import('../stores/useWorldStore')
const {
  syncRoadmapToFirestore,
  hydrateRoadmapFromFirestore,
  syncTasksToFirestore,
  hydratePortfolioFromFirestore,
  syncMapToFirestore,
  hydrateMapFromFirestore,
  armMapSync,
  disarmMapSync,
  visitMap,
  returnHome,
} = await import('./syncManager')

describe('SyncManager (roadmap instance)', () => {
  beforeEach(() => {
    setDoc.mockReset()
    getDoc.mockReset()
    useRoadmapStore.setState({ nodes: [], edges: [] })
  })

  // --- success push: writes the slice with merge:true ---
  it('writes nodes and edges to users/{uid} with merge:true', async () => {
    const nodes = [{ id: 'n1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Step' } }]
    const edges = [{ id: 'e1', source: 'n1', target: 'n2' }]
    useRoadmapStore.setState({ nodes, edges })
    setDoc.mockResolvedValue(undefined)

    await syncRoadmapToFirestore('uid-123')

    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      { roadmap: { nodes, edges }, roadmapUpdatedAt: { _type: 'serverTimestamp' } },
      { merge: true },
    )
  })

  // --- null uid: no-op ---
  it('does nothing when uid is null', async () => {
    await syncRoadmapToFirestore(null)
    expect(setDoc).not.toHaveBeenCalled()
  })

  // --- hydrate: Firestore data loaded into the store ---
  it('loads Firestore roadmap into the store when cloud data exists', async () => {
    const cloudNodes = [{ id: 'cloud-1', type: 'condition', position: { x: 50, y: 50 }, data: {} }]
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ roadmap: { nodes: cloudNodes, edges: [] } }),
    })

    await hydrateRoadmapFromFirestore('uid-123')

    const { nodes, edges } = useRoadmapStore.getState()
    expect(nodes).toEqual(cloudNodes)
    expect(edges).toEqual([])
  })

  it('sets syncStatus to saving then saved around a successful push', async () => {
    useRoadmapStore.setState({ nodes: [], edges: [], syncStatus: 'idle' })
    let resolveSetDoc
    setDoc.mockReturnValue(new Promise((resolve) => { resolveSetDoc = resolve }))

    const pushPromise = syncRoadmapToFirestore('uid-123')
    expect(useRoadmapStore.getState().syncStatus).toBe('saving')

    resolveSetDoc()
    await pushPromise

    expect(useRoadmapStore.getState().syncStatus).toBe('saved')
  })

  it('sets syncStatus to error when the push fails', async () => {
    useRoadmapStore.setState({ nodes: [], edges: [], syncStatus: 'idle' })
    setDoc.mockRejectedValue(new Error('network down'))

    await syncRoadmapToFirestore('uid-123')

    expect(useRoadmapStore.getState().syncStatus).toBe('error')
  })
})

describe('SyncManager (tasks instance)', () => {
  beforeEach(() => {
    setDoc.mockReset()
    getDoc.mockReset()
    useTaskStore.setState({ tasks: [], trash: [] })
  })

  it('writes tasks and trash to users/{uid} with merge:true', async () => {
    const tasks = [{ id: 't1', title: 'Do it', completed: false }]
    const trash = [{ id: 't0', title: 'Old' }]
    useTaskStore.setState({ tasks, trash })
    setDoc.mockResolvedValue(undefined)

    await syncTasksToFirestore('uid-123')

    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      { tasks, trash, tasksUpdatedAt: { _type: 'serverTimestamp' } },
      { merge: true },
    )
  })
})

describe('SyncManager (portfolio instance)', () => {
  beforeEach(() => {
    setDoc.mockReset()
    getDoc.mockReset()
    useUserStore.setState({ portfolioData: {}, journeys: {}, profilePhotoURL: null })
  })

  it('maps a Firestore photoURL onto profilePhotoURL when hydrating', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        portfolioData: { bio: 'hi' },
        journeys: { mastery: [] },
        photoURL: 'https://cdn/me.png',
      }),
    })

    await hydratePortfolioFromFirestore('uid-123')

    expect(useUserStore.getState().profilePhotoURL).toBe('https://cdn/me.png')
  })

  it('seeds Firestore when journeys are missing (first migration)', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ portfolioData: { bio: 'hi' } }), // no journeys field
    })
    setDoc.mockResolvedValue(undefined)

    await hydratePortfolioFromFirestore('uid-123')

    expect(setDoc).toHaveBeenCalled()
  })
})

describe('SyncManager (map instance)', () => {
  beforeEach(() => {
    setDoc.mockReset()
    getDoc.mockReset()
  })

  it('writes objectsByMap to maps/{uid} (not users/{uid}) with merge:true', async () => {
    const objectsByMap = { test3: [{ key: 'wood_bridge', x: 100, y: 200 }] }
    setDoc.mockResolvedValue(undefined)

    await syncMapToFirestore('uid-123', objectsByMap)

    expect(setDoc).toHaveBeenCalledWith(
      { _path: 'maps/uid-123' },
      { objectsByMap, mapUpdatedAt: { _type: 'serverTimestamp' } },
      { merge: true },
    )
  })

  it('does nothing when uid is null', async () => {
    await syncMapToFirestore(null, {})
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('loads objectsByMap from maps/{uid} into the useWorldStore', async () => {
    const cloudObjectsByMap = { test3: [{ key: 'grass_things', x: 50, y: 75 }] }
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ objectsByMap: cloudObjectsByMap }),
    })

    useWorldStore.setState({ objectsByMap: {} })

    await hydrateMapFromFirestore('uid-123')

    expect(useWorldStore.getState().objectsByMap).toEqual(cloudObjectsByMap)
  })

  it('back-compat: migrates old flat objects array into test3 slot', async () => {
    const cloudObjects = [{ key: 'grass_things', x: 50, y: 75 }]
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ objects: cloudObjects }),
    })

    useWorldStore.setState({ objectsByMap: {} })

    await hydrateMapFromFirestore('uid-123')

    expect(useWorldStore.getState().objectsByMap).toEqual({ test3: cloudObjects })
  })

  it('leaves objectsByMap empty when the map doc has no objects field', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) })

    useWorldStore.setState({ objectsByMap: {} })

    await hydrateMapFromFirestore('uid-123')

    expect(useWorldStore.getState().objectsByMap).toEqual({})
  })
})

describe('SyncManager (armMapSync / disarmMapSync)', () => {
  beforeEach(() => {
    setDoc.mockReset()
    disarmMapSync()
    useWorldStore.setState({
      objectsByMap: {},
      mapObjects: [],
      currentMapOwnerUid: null,
      currentMapKey: null,
      editMode: false,
      selectedItemKey: null,
    })
  })

  it('debounces a write to maps/{uid} when objectsByMap changes on the owner\'s own map', async () => {
    vi.useFakeTimers()
    setDoc.mockResolvedValue(undefined)

    useWorldStore.setState({ currentMapOwnerUid: 'uid-123', currentMapKey: 'test3' })
    armMapSync('uid-123')

    useWorldStore.getState().addObject({ key: 'wood_bridge', x: 10, y: 20 })

    // Not yet — debounce hasn't fired
    expect(setDoc).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()

    expect(setDoc).toHaveBeenCalledWith(
      { _path: 'maps/uid-123' },
      expect.objectContaining({ objectsByMap: { test3: [{ key: 'wood_bridge', x: 10, y: 20 }] } }),
      { merge: true },
    )

    vi.useRealTimers()
  })

  it('does not write when the signed-in user is viewing someone else\'s map', async () => {
    vi.useFakeTimers()

    // uid-123 is logged in but viewing uid-other's map
    useWorldStore.setState({ currentMapOwnerUid: 'uid-other', currentMapKey: 'test3' })
    armMapSync('uid-123')

    useWorldStore.getState().addObject({ key: 'wood_bridge', x: 10, y: 20 })
    await vi.runAllTimersAsync()

    expect(setDoc).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('stops writing after disarmMapSync is called', async () => {
    vi.useFakeTimers()
    setDoc.mockResolvedValue(undefined)

    useWorldStore.setState({ currentMapOwnerUid: 'uid-123', currentMapKey: 'test3' })
    armMapSync('uid-123')
    disarmMapSync()

    useWorldStore.getState().addObject({ key: 'wood_bridge', x: 10, y: 20 })
    await vi.runAllTimersAsync()

    expect(setDoc).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})

describe('visitMap / returnHome', () => {
  beforeEach(() => {
    setDoc.mockReset()
    getDoc.mockReset()
    disarmMapSync()
    useWorldStore.setState({
      currentMapOwnerUid: 'uid-self',
      objectsByMap: { test3: [{ key: 'wood_bridge', x: 0, y: 0 }] },
      mapObjects: [{ key: 'wood_bridge', x: 0, y: 0 }],
      editMode: false,
      selectedItemKey: null,
    })
  })

  it('visitMap swaps currentMapOwnerUid to the visited owner', async () => {
    getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) })

    await visitMap('uid-friend')

    expect(useWorldStore.getState().currentMapOwnerUid).toBe('uid-friend')
  })

  it('visitMap clears objectsByMap before loading the visited map', async () => {
    let capturedObjectsByMap = null
    getDoc.mockImplementation(async () => {
      capturedObjectsByMap = useWorldStore.getState().objectsByMap
      return { exists: () => false, data: () => ({}) }
    })

    await visitMap('uid-friend')

    expect(capturedObjectsByMap).toEqual({})
  })

  it('visitMap loads the visited owner\'s objectsByMap from Firestore', async () => {
    const friendObjectsByMap = { test3: [{ key: 'grass_things', x: 100, y: 200 }] }
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ objectsByMap: friendObjectsByMap }),
    })

    await visitMap('uid-friend')

    expect(useWorldStore.getState().objectsByMap).toEqual(friendObjectsByMap)
  })

  it('visitMap resets editMode to false', async () => {
    useWorldStore.setState({ editMode: true })
    getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) })

    await visitMap('uid-friend')

    expect(useWorldStore.getState().editMode).toBe(false)
  })

  it('returnHome swaps currentMapOwnerUid back to the signed-in user', async () => {
    useWorldStore.setState({ currentMapOwnerUid: 'uid-friend' })
    getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) })

    await returnHome('uid-self')

    expect(useWorldStore.getState().currentMapOwnerUid).toBe('uid-self')
  })

  it('returnHome loads self\'s objectsByMap from Firestore', async () => {
    const ownObjectsByMap = { test3: [{ key: 'wood_bridge', x: 50, y: 75 }] }
    useWorldStore.setState({ currentMapOwnerUid: 'uid-friend', objectsByMap: {} })
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ objectsByMap: ownObjectsByMap }),
    })

    await returnHome('uid-self')

    expect(useWorldStore.getState().objectsByMap).toEqual(ownObjectsByMap)
  })
})
