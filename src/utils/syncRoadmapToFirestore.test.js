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
vi.mock('../lib/db', () => ({
  refs: { user: (uid) => ({ _path: `users/${uid}` }) },
}))

// Stub localStorage so Zustand persist doesn't blow up
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

const { useRoadmapStore } = await import('../stores/useRoadmapStore')
const { syncRoadmapToFirestore, hydrateRoadmapFromFirestore } = await import('./syncRoadmapToFirestore')

describe('syncRoadmapToFirestore', () => {
  beforeEach(() => {
    setDoc.mockReset()
    getDoc.mockReset()
    useRoadmapStore.setState({ nodes: [], edges: [] })
  })

  // --- Slice 1: write board to Firestore ---
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

  it('does nothing when uid is null', async () => {
    await syncRoadmapToFirestore(null)
    expect(setDoc).not.toHaveBeenCalled()
  })

  // --- Slice 2: hydrate from Firestore (Firestore wins) ---
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

  // --- Slice 3: seed Firestore on first migration ---
  it('seeds Firestore when roadmap field is absent (first migration)', async () => {
    useRoadmapStore.setState({ nodes: [{ id: 'local-1', type: 'process', position: { x: 0, y: 0 }, data: {} }], edges: [] })
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({}), // no roadmap field
    })
    setDoc.mockResolvedValue(undefined)

    await hydrateRoadmapFromFirestore('uid-123')

    expect(setDoc).toHaveBeenCalled()
  })
})
