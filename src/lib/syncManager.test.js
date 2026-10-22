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

describe('returnHome', () => {
  beforeEach(() => {
    useWorldStore.setState({ currentMapOwnerUid: 'uid-friend', currentMapKey: 'school_hub' })
  })

  it('puts the signed-in user back as owner of their own world', async () => {
    await returnHome('uid-self')
    expect(useWorldStore.getState().currentMapOwnerUid).toBe('uid-self')
  })

  it('switches the map key in the same update when one is given, so presence never joins the wrong room', async () => {
    await returnHome('uid-self', 'room')
    expect(useWorldStore.getState()).toMatchObject({ currentMapOwnerUid: 'uid-self', currentMapKey: 'room' })
  })

  it('leaves the map key alone when none is given', async () => {
    await returnHome('uid-self')
    expect(useWorldStore.getState().currentMapKey).toBe('school_hub')
  })

  it('does nothing without a user', async () => {
    await returnHome(null, 'room')
    expect(useWorldStore.getState()).toMatchObject({ currentMapOwnerUid: 'uid-friend', currentMapKey: 'school_hub' })
  })
})
