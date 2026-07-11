import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IR_SHEET_ID } from '../constants/irBoard'
import { ADMIN_UID } from '../constants/admin'

const m = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  armRoadmapSheetSync: vi.fn(),
  disarmRoadmapSheetSync: vi.fn(),
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
      sheets: [{ id: 'sheet-1', name: 'My Roadmap', nodes: [], edges: [], ownerUid: 'alice', myRole: 'owner' }],
      activeSheetId: 'sheet-1',
    })
  })

  it('unmountIrBoard restores prior sheets and activeSheetId', async () => {
    const token = await mountIrBoard()
    await unmountIrBoard(token)

    const { sheets, activeSheetId } = useRoadmapStore.getState()
    expect(sheets.find((s) => s.id === IR_SHEET_ID)).toBeUndefined()
    expect(activeSheetId).toBe('sheet-1')
    expect(m.disarmRoadmapSheetSync).toHaveBeenCalled()
    expect(m.armRoadmapSheetSync).toHaveBeenLastCalledWith('sheet-1')
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
})
