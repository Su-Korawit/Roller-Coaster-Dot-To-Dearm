import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  arrayUnion: vi.fn((v) => ({ _arrayUnion: v })),
  arrayRemove: vi.fn((v) => ({ _arrayRemove: v })),
  armRoadmapSheetSync: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  setDoc: (...a) => m.setDoc(...a),
  updateDoc: (...a) => m.updateDoc(...a),
  deleteDoc: (...a) => m.deleteDoc(...a),
  getDoc: (...a) => m.getDoc(...a),
  arrayUnion: (...a) => m.arrayUnion(...a),
  arrayRemove: (...a) => m.arrayRemove(...a),
}))
vi.mock('../firebase', () => ({ auth: { currentUser: { uid: 'alice' } } }))
vi.mock('../lib/db', () => ({
  refs: {
    user: (uid) => ({ _path: `users/${uid}` }),
    roadmapSheet: (id) => ({ _path: `roadmapSheets/${id}` }),
  },
  shapes: {
    newRoadmapSheet: ({ ownerUid, name, order }) => ({
      ownerUid, name, order, nodes: [], edges: [], collaborators: {}, collaboratorUids: [],
    }),
  },
}))
vi.mock('../lib/syncManager', () => ({
  armRoadmapSheetSync: (...a) => m.armRoadmapSheetSync(...a),
}))

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })

const { useRoadmapStore } = await import('../stores/useRoadmapStore')
const {
  createSheetAndSync,
  switchSheetAndSync,
  renameSheetAndSync,
  deleteSheetAndSync,
  shareSheet,
  setSheetPublic,
  buildPublicShareUrl,
} = await import('./roadmapSheets')

describe('roadmapSheets service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.setDoc.mockResolvedValue(undefined)
    m.updateDoc.mockResolvedValue(undefined)
    m.deleteDoc.mockResolvedValue(undefined)
    useRoadmapStore.setState({
      nodes: [], edges: [], setpoint: null, selection: [],
      sheets: [{ id: 'sheet-1', name: 'Roadmap', nodes: [], edges: [], ownerUid: 'alice', myRole: 'owner' }],
      activeSheetId: 'sheet-1',
      myUid: 'alice',
    })
  })

  it('createSheetAndSync creates the sheet locally, persists it, registers it, and arms sync', async () => {
    const id = await createSheetAndSync('Side Project')

    expect(useRoadmapStore.getState().sheets.find((s) => s.id === id).name).toBe('Side Project')
    expect(m.setDoc).toHaveBeenCalledWith({ _path: `roadmapSheets/${id}` }, expect.objectContaining({ name: 'Side Project', ownerUid: 'alice' }))
    expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'users/alice' }, { roadmapSheetIds: { _arrayUnion: id } })
    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith(id)
  })

  it('switchSheetAndSync flips the active sheet locally and re-arms sync without any Firestore read', async () => {
    useRoadmapStore.setState((s) => ({ sheets: [...s.sheets, { id: 'sheet-2', name: 'Other', nodes: [], edges: [], ownerUid: 'alice', myRole: 'owner' }] }))

    switchSheetAndSync('sheet-2')

    expect(useRoadmapStore.getState().activeSheetId).toBe('sheet-2')
    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-2')
    expect(m.setDoc).not.toHaveBeenCalled()
    expect(m.updateDoc).not.toHaveBeenCalled()
  })

  it('renameSheetAndSync updates the store immediately and writes the name directly (not debounced)', async () => {
    await renameSheetAndSync('sheet-1', 'Renamed')

    expect(useRoadmapStore.getState().sheets.find((s) => s.id === 'sheet-1').name).toBe('Renamed')
    expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/sheet-1' }, { name: 'Renamed' })
  })

  it('deleteSheetAndSync deletes the doc, removes it from roadmapSheetIds, and re-arms sync to the fallback sheet', async () => {
    useRoadmapStore.setState((s) => ({ sheets: [...s.sheets, { id: 'sheet-2', name: 'Other', nodes: [], edges: [], ownerUid: 'alice', myRole: 'owner' }] }))

    await deleteSheetAndSync('sheet-1')

    expect(useRoadmapStore.getState().sheets.find((s) => s.id === 'sheet-1')).toBeUndefined()
    expect(m.deleteDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/sheet-1' })
    expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'users/alice' }, { roadmapSheetIds: { _arrayRemove: 'sheet-1' } })
    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-2')
  })

  it('deleteSheetAndSync does not re-arm sync when the deleted sheet was not active', async () => {
    useRoadmapStore.setState((s) => ({ sheets: [...s.sheets, { id: 'sheet-2', name: 'Other', nodes: [], edges: [], ownerUid: 'alice', myRole: 'owner' }] }))

    await deleteSheetAndSync('sheet-2')

    expect(m.armRoadmapSheetSync).not.toHaveBeenCalled()
  })

  it('shareSheet writes both collaborators and collaboratorUids in one update', async () => {
    await shareSheet('sheet-1', 'bob', 'edit')

    expect(m.updateDoc).toHaveBeenCalledWith(
      { _path: 'roadmapSheets/sheet-1' },
      { 'collaborators.bob': 'edit', collaboratorUids: { _arrayUnion: 'bob' } },
    )
  })

  it('shareSheet throws when the caller is not the sheet\'s owner', async () => {
    useRoadmapStore.setState((s) => ({
      sheets: s.sheets.map((sh) => (sh.id === 'sheet-1' ? { ...sh, myRole: 'edit' } : sh)),
    }))

    await expect(shareSheet('sheet-1', 'bob', 'edit')).rejects.toThrow()
    expect(m.updateDoc).not.toHaveBeenCalled()
  })

  describe('setSheetPublic / buildPublicShareUrl', () => {
    it('mints a shareId on first enable', async () => {
      m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) })
      const shareId = await setSheetPublic('sheet-1', true)
      expect(shareId).toBeTruthy()
      expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/sheet-1' }, { public: true, shareId })
    })

    it('reuses an existing shareId instead of minting a new one', async () => {
      m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ shareId: 'existing-id' }) })
      const shareId = await setSheetPublic('sheet-1', true)
      expect(shareId).toBe('existing-id')
      expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/sheet-1' }, { public: true })
    })

    it('turning off just flips public, keeping shareId untouched', async () => {
      m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ shareId: 'existing-id', public: true }) })
      const shareId = await setSheetPublic('sheet-1', false)
      expect(shareId).toBe('existing-id')
      expect(m.updateDoc).toHaveBeenCalledWith({ _path: 'roadmapSheets/sheet-1' }, { public: false })
    })

    it('throws when the caller is not the owner', async () => {
      useRoadmapStore.setState((s) => ({
        sheets: s.sheets.map((sh) => (sh.id === 'sheet-1' ? { ...sh, myRole: 'edit' } : sh)),
      }))
      await expect(setSheetPublic('sheet-1', true)).rejects.toThrow()
      expect(m.updateDoc).not.toHaveBeenCalled()
    })

    it('builds the canonical roadmap.ilovetcas.com view URL', () => {
      expect(buildPublicShareUrl('abc123')).toBe('https://roadmap.ilovetcas.com/view/abc123')
    })
  })
})
