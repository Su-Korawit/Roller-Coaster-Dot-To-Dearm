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

  it('writes objects to maps/{uid} (not users/{uid}) with merge:true', async () => {
    const objects = [{ key: 'wood_bridge', x: 100, y: 200 }]
    setDoc.mockResolvedValue(undefined)

    await syncMapToFirestore('uid-123', objects)

    expect(setDoc).toHaveBeenCalledWith(
      { _path: 'maps/uid-123' },
      { objects, mapUpdatedAt: { _type: 'serverTimestamp' } },
      { merge: true },
    )
  })

  it('does nothing when uid is null', async () => {
    await syncMapToFirestore(null, [])
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('loads objects from maps/{uid} into the useWorldStore', async () => {
    const cloudObjects = [{ key: 'grass_things', x: 50, y: 75 }]
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ objects: cloudObjects }),
    })

    useWorldStore.setState({ mapObjects: [] })

    await hydrateMapFromFirestore('uid-123')

    expect(useWorldStore.getState().mapObjects).toEqual(cloudObjects)
  })

  it('leaves mapObjects empty when the map doc has no objects field', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) })

    useWorldStore.setState({ mapObjects: [] })

    await hydrateMapFromFirestore('uid-123')

    expect(useWorldStore.getState().mapObjects).toEqual([])
  })
})

describe('SyncManager (armMapSync / disarmMapSync)', () => {
  beforeEach(() => {
    setDoc.mockReset()
    disarmMapSync()
    useWorldStore.setState({
      mapObjects: [],
      currentMapOwnerUid: null,
      editMode: false,
      selectedItemKey: null,
    })
  })

  it('debounces a write to maps/{uid} when mapObjects change on the owner\'s own map', async () => {
    vi.useFakeTimers()
    setDoc.mockResolvedValue(undefined)

    useWorldStore.setState({ currentMapOwnerUid: 'uid-123' })
    armMapSync('uid-123')

    useWorldStore.getState().addObject({ key: 'wood_bridge', x: 10, y: 20 })

    // Not yet — debounce hasn't fired
    expect(setDoc).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()

    expect(setDoc).toHaveBeenCalledWith(
      { _path: 'maps/uid-123' },
      expect.objectContaining({ objects: [{ key: 'wood_bridge', x: 10, y: 20 }] }),
      { merge: true },
    )

    vi.useRealTimers()
  })

  it('does not write when the signed-in user is viewing someone else\'s map', async () => {
    vi.useFakeTimers()

    // uid-123 is logged in but viewing uid-other's map
    useWorldStore.setState({ currentMapOwnerUid: 'uid-other' })
    armMapSync('uid-123')

    useWorldStore.getState().addObject({ key: 'wood_bridge', x: 10, y: 20 })
    await vi.runAllTimersAsync()

    expect(setDoc).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('stops writing after disarmMapSync is called', async () => {
    vi.useFakeTimers()
    setDoc.mockResolvedValue(undefined)

    useWorldStore.setState({ currentMapOwnerUid: 'uid-123' })
    armMapSync('uid-123')
    disarmMapSync()

    useWorldStore.getState().addObject({ key: 'wood_bridge', x: 10, y: 20 })
    await vi.runAllTimersAsync()

    expect(setDoc).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})
