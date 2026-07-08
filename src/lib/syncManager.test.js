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
    roadmapSheet: (sheetId) => ({ _path: `roadmapSheets/${sheetId}` }),
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
  syncTasksToFirestore,
  hydratePortfolioFromFirestore,
  syncMapToFirestore,
  hydrateMapFromFirestore,
  armMapSync,
  disarmMapSync,
  visitMap,
  returnHome,
  pushRoadmapSheetToFirestore,
  hydrateRoadmapSheetFromFirestore,
  armRoadmapSheetSync,
  disarmRoadmapSheetSync,
} = await import('./syncManager')

describe('SyncManager (roadmap sheet instance)', () => {
  beforeEach(() => {
    setDoc.mockReset()
    getDoc.mockReset()
    useRoadmapStore.setState({
      nodes: [], edges: [], setpoint: null, selection: [],
      sheets: [{ id: 'sheet-a', name: 'Roadmap', nodes: [], edges: [], ownerUid: 'uid-123', myRole: 'owner' }],
      activeSheetId: 'sheet-a',
      myUid: 'uid-123',
    })
    disarmRoadmapSheetSync()
  })

  it('writes nodes and edges to roadmapSheets/{sheetId} with merge:true', async () => {
    const nodes = [{ id: 'n1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Step' } }]
    const edges = [{ id: 'e1', source: 'n1', target: 'n2' }]
    useRoadmapStore.setState((s) => ({
      nodes, edges,
      sheets: s.sheets.map((sh) => (sh.id === 'sheet-a' ? { ...sh, nodes, edges } : sh)),
    }))
    setDoc.mockResolvedValue(undefined)

    await pushRoadmapSheetToFirestore('sheet-a')

    expect(setDoc).toHaveBeenCalledWith(
      { _path: 'roadmapSheets/sheet-a' },
      { nodes, edges, timeline: null, updatedAt: { _type: 'serverTimestamp' } },
      { merge: true },
    )
  })

  it('loads a sheet doc\'s nodes/edges into the store when hydrating', async () => {
    const cloudNodes = [{ id: 'cloud-1', type: 'condition', position: { x: 50, y: 50 }, data: {} }]
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ nodes: cloudNodes, edges: [] }),
    })

    await hydrateRoadmapSheetFromFirestore('sheet-a')

    const { nodes, edges } = useRoadmapStore.getState()
    expect(nodes).toEqual(cloudNodes)
    expect(edges).toEqual([])
  })

  it('debounces a write only for the ACTIVE sheet', async () => {
    vi.useFakeTimers()
    setDoc.mockResolvedValue(undefined)
    armRoadmapSheetSync('sheet-a')

    useRoadmapStore.getState().addNode('process')
    expect(setDoc).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()

    expect(setDoc).toHaveBeenCalledWith(
      { _path: 'roadmapSheets/sheet-a' },
      expect.objectContaining({ nodes: expect.any(Array) }),
      { merge: true },
    )
    vi.useRealTimers()
  })

  it('does not write when the caller\'s role on the sheet is "view"', async () => {
    vi.useFakeTimers()
    useRoadmapStore.setState((s) => ({
      sheets: s.sheets.map((sh) => (sh.id === 'sheet-a' ? { ...sh, myRole: 'view' } : sh)),
    }))
    armRoadmapSheetSync('sheet-a')

    useRoadmapStore.getState().addNode('process')
    await vi.runAllTimersAsync()

    expect(setDoc).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('stops writing after disarmRoadmapSheetSync is called', async () => {
    vi.useFakeTimers()
    setDoc.mockResolvedValue(undefined)
    armRoadmapSheetSync('sheet-a')
    disarmRoadmapSheetSync()

    useRoadmapStore.getState().addNode('process')
    await vi.runAllTimersAsync()

    expect(setDoc).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('switching the armed target stops writes to the old sheet and starts writing to the new one', async () => {
    vi.useFakeTimers()
    setDoc.mockResolvedValue(undefined)
    useRoadmapStore.setState((s) => ({
      sheets: [...s.sheets, { id: 'sheet-b', name: 'Other', nodes: [], edges: [], ownerUid: 'uid-123', myRole: 'owner' }],
    }))
    armRoadmapSheetSync('sheet-a')

    useRoadmapStore.getState().switchSheet('sheet-b')
    useRoadmapStore.getState().addNode('process')
    await vi.runAllTimersAsync()
    expect(setDoc).not.toHaveBeenCalled()

    armRoadmapSheetSync('sheet-b')
    useRoadmapStore.getState().addNode('condition')
    await vi.runAllTimersAsync()
    expect(setDoc).toHaveBeenCalledWith(
      { _path: 'roadmapSheets/sheet-b' },
      expect.anything(),
      { merge: true },
    )
    vi.useRealTimers()
  })

  it('flushes a pending debounced write to the original sheet when switching before the timer fires', async () => {
    vi.useFakeTimers()
    setDoc.mockResolvedValue(undefined)
    useRoadmapStore.setState({
      sheets: [
        { id: 'sheet-a', name: 'A', nodes: [], edges: [], ownerUid: 'uid-123', myRole: 'owner' },
        { id: 'sheet-b', name: 'B', nodes: [], edges: [], ownerUid: 'uid-123', myRole: 'owner' },
      ],
      activeSheetId: 'sheet-a',
      nodes: [],
      edges: [],
    })
    armRoadmapSheetSync('sheet-a')
    useRoadmapStore.getState().addNode('process')
    expect(setDoc).not.toHaveBeenCalled()

    useRoadmapStore.getState().switchSheet('sheet-b')
    armRoadmapSheetSync('sheet-b')

    await vi.runAllTimersAsync()

    expect(setDoc).toHaveBeenCalledWith(
      { _path: 'roadmapSheets/sheet-a' },
      expect.objectContaining({ nodes: expect.arrayContaining([expect.objectContaining({ type: 'process' })]) }),
      { merge: true },
    )
    vi.useRealTimers()
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
