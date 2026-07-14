import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IR_SHEET_ID } from '../constants/irBoard'
import { ADMIN_UID } from '../constants/admin'

const m = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  armRoadmapSheetSync: vi.fn(),
  disarmRoadmapSheetSync: vi.fn(),
  attach: vi.fn(),
  detach: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getDoc: (...a) => m.getDoc(...a),
  setDoc: (...a) => m.setDoc(...a),
}))
vi.mock('../lib/db', () => ({
  refs: {
    roadmapSheet: (id) => ({ _path: `roadmapSheets/${id}` }),
  },
  shapes: {
    newRoadmapSheet: (args) => ({
      ...args,
      collaborators: {},
      collaboratorUids: [],
    }),
  },
}))
vi.mock('../lib/syncManager', () => ({
  armRoadmapSheetSync: (...a) => m.armRoadmapSheetSync(...a),
  disarmRoadmapSheetSync: (...a) => m.disarmRoadmapSheetSync(...a),
}))
vi.mock('../lib/firestoreListener', () => ({
  createFirestoreListener: () => ({ attach: (...a) => m.attach(...a), detach: (...a) => m.detach(...a) }),
}))

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })

const { useRoadmapStore } = await import('../stores/useRoadmapStore')
const { mountIrBoard, unmountIrBoard, ensureIrBoardDoc } = await import('./irBoardSession')

describe('irBoardSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'IR Board',
        nodes: [{ id: 'n1' }],
        edges: [],
        ownerUid: ADMIN_UID,
      }),
    })
    m.setDoc.mockResolvedValue(undefined)
    useRoadmapStore.setState({
      nodes: [], edges: [], setpoint: null, selection: [], syncStatus: 'idle',
      sheets: [
        { id: 'sheet-1', name: 'My Roadmap', nodes: [], edges: [], ownerUid: 'alice', myRole: 'owner' },
      ],
      activeSheetId: 'sheet-1',
      myUid: 'alice',
    })
  })

  it('mountIrBoard injects IR sheet with edit role and arms sync', async () => {
    const token = await mountIrBoard()

    const { sheets, activeSheetId } = useRoadmapStore.getState()
    const irSheet = sheets.find((s) => s.id === IR_SHEET_ID)
    expect(irSheet).toMatchObject({
      id: IR_SHEET_ID,
      name: 'IR Board',
      myRole: 'edit',
      ownerUid: ADMIN_UID,
      nodes: [{ id: 'n1' }],
    })
    expect(activeSheetId).toBe(IR_SHEET_ID)
    expect(m.disarmRoadmapSheetSync).toHaveBeenCalled()
    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith(IR_SHEET_ID)
    expect(token).toEqual({
      seq: expect.any(Number),
      sheets: [{ id: 'sheet-1', name: 'My Roadmap', nodes: [], edges: [], ownerUid: 'alice', myRole: 'owner' }],
      activeSheetId: 'sheet-1',
    })
    expect(useRoadmapStore.getState().irReturnSheetId).toBe('sheet-1')
  })

  it('unmountIrBoard restores prior sheets and activeSheetId', async () => {
    const token = await mountIrBoard()
    await unmountIrBoard(token)

    const { sheets, activeSheetId } = useRoadmapStore.getState()
    expect(sheets.find((s) => s.id === IR_SHEET_ID)).toBeUndefined()
    expect(activeSheetId).toBe('sheet-1')
    expect(m.disarmRoadmapSheetSync).toHaveBeenCalled()
    expect(m.armRoadmapSheetSync).toHaveBeenLastCalledWith('sheet-1')
    expect(useRoadmapStore.getState().irReturnSheetId).toBe(null)
  })

  it('ignores a superseded mount and its unmount (StrictMode double-mount race)', async () => {
    let resolveFirst
    m.getDoc.mockImplementationOnce(() => new Promise((res) => { resolveFirst = res }))

    const mount1 = mountIrBoard() // pending on the deferred getDoc
    const mount2 = mountIrBoard() // resolves via the default mock
    const token2 = await mount2
    resolveFirst({
      exists: () => true,
      data: () => ({ name: 'IR Board', nodes: [], edges: [], ownerUid: ADMIN_UID }),
    })
    const token1 = await mount1

    // mount1 was superseded — its late unmount (StrictMode cleanup) must not
    // restore user sheets while the live mount still shows the board.
    await unmountIrBoard(token1)
    expect(useRoadmapStore.getState().activeSheetId).toBe(IR_SHEET_ID)

    await unmountIrBoard(token2)
    expect(useRoadmapStore.getState().activeSheetId).toBe('sheet-1')
    expect(useRoadmapStore.getState().sheets.find((s) => s.id === IR_SHEET_ID)).toBeUndefined()
  })

  it('re-arms prior sheet sync when ensureIrBoardDoc fails after disarm', async () => {
    m.getDoc.mockRejectedValue(new Error('Firestore unavailable'))

    await expect(mountIrBoard()).rejects.toThrow('Firestore unavailable')

    expect(m.disarmRoadmapSheetSync).toHaveBeenCalled()
    expect(m.armRoadmapSheetSync).toHaveBeenCalledWith('sheet-1')
    expect(useRoadmapStore.getState().activeSheetId).toBe('sheet-1')
  })

  it('ensureIrBoardDoc creates the sheet doc when missing', async () => {
    m.getDoc.mockResolvedValue({ exists: () => false })

    const data = await ensureIrBoardDoc()

    expect(m.setDoc).toHaveBeenCalledWith(
      { _path: `roadmapSheets/${IR_SHEET_ID}` },
      expect.objectContaining({ name: 'IR Board', ownerUid: ADMIN_UID, order: -1 }),
    )
    expect(data).toMatchObject({ name: 'IR Board', ownerUid: ADMIN_UID })
  })

  it('mountIrBoard attaches a real-time listener on the admin-idea-board doc', async () => {
    await mountIrBoard()
    expect(m.attach).toHaveBeenCalledWith({ _path: `roadmapSheets/${IR_SHEET_ID}` }, expect.any(Function))
  })

  it('the listener ignores the local echo of our own pending write', async () => {
    await mountIrBoard()
    const handler = m.attach.mock.calls[0][1]
    handler({
      metadata: { hasPendingWrites: true },
      data: () => ({ nodes: [{ id: 'from-remote' }], edges: [] }),
    })
    expect(useRoadmapStore.getState().nodes).not.toEqual([{ id: 'from-remote' }])
  })

  it('the listener applies a genuine remote snapshot (a script write) into the live IR sheet', async () => {
    await mountIrBoard()
    const handler = m.attach.mock.calls[0][1]
    handler({
      metadata: { hasPendingWrites: false },
      data: () => ({ nodes: [{ id: 'from-script' }], edges: [] }),
    })
    const { nodes, sheets } = useRoadmapStore.getState()
    expect(nodes).toEqual([{ id: 'from-script' }])
    expect(sheets.find((s) => s.id === IR_SHEET_ID).nodes).toEqual([{ id: 'from-script' }])
  })

  it('unmountIrBoard detaches the listener', async () => {
    const token = await mountIrBoard()
    await unmountIrBoard(token)
    expect(m.detach).toHaveBeenCalled()
  })
})
