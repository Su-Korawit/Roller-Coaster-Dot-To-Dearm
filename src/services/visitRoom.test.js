import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ getDoc: vi.fn(), returnHome: vi.fn(), uid: 'me' }))
vi.mock('firebase/firestore', () => ({ getDoc: (...a) => m.getDoc(...a), getDocs: vi.fn() }))
vi.mock('../lib/db', () => ({
  refs: { room: (u) => ({ path: `rooms/${u}` }) },
  cols: {},
  shapes: {
    roomLayout: (d) => ({ tier: d?.tier ?? 0, theme: d?.theme ?? 'minimal', petId: d?.petId ?? null, placed: Array.isArray(d?.placed) ? d.placed : [] }),
  },
}))
vi.mock('../lib/syncManager', () => ({ returnHome: (...a) => m.returnHome(...a) }))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: m.uid ? { uid: m.uid } : null }) } }))
vi.mock('./roomApi', () => ({ saveRoomLayout: vi.fn(), buyRoomItem: vi.fn(), claimWelcomePack: vi.fn() }))

const { visitRoom, leaveVisit, endVisitOnLeaving } = await import('./visitRoom')
const { useVisitStore } = await import('../stores/useVisitStore')
const { useWorldStore } = await import('../stores/useWorldStore')
const { useSchoolWorldStore } = await import('../stores/useSchoolWorldStore')
const { useRoomStore } = await import('../stores/useRoomStore')
const { ROOM_CATALOG } = await import('../data/roomCatalogSeed')
const { STARTER_LAYOUT } = await import('../room/defaultLayout')

const friendRoom = { tier: 2, theme: 'cafe', petId: 'pet_shiba', placed: [{ itemId: 'desk_basic', x: 96, y: 32 }, { itemId: 'ghost_item', x: 8, y: 8 }] }

beforeEach(() => {
  vi.clearAllMocks()
  m.uid = 'me'
  m.returnHome.mockResolvedValue(undefined)
  m.getDoc.mockResolvedValue({ exists: () => true, data: () => friendRoom })
  useVisitStore.getState().end()
  useWorldStore.setState({ currentMapOwnerUid: 'me', currentMapKey: 'campus' })
  useSchoolWorldStore.setState({ mapChangeRequest: null, mapSwitchingSince: null })
  useRoomStore.setState({ layout: STARTER_LAYOUT, catalog: ROOM_CATALOG, decorating: false })
})

describe('visitRoom', () => {
  it('opens a friend’s room read-only: their layout, presence in their room, a map switch to the room', async () => {
    const r = await visitRoom('friend-1')
    expect(r).toEqual({ ok: true })
    const v = useVisitStore.getState().visiting
    expect(v.ownerUid).toBe('friend-1')
    expect(v.layout).toMatchObject({ tier: 2, theme: 'cafe', petId: 'pet_shiba' })
    expect(useWorldStore.getState()).toMatchObject({ currentMapOwnerUid: 'friend-1', currentMapKey: 'room' })
    expect(useSchoolWorldStore.getState().mapChangeRequest).toMatchObject({ mapKey: 'room' })
    expect(useSchoolWorldStore.getState().mapSwitchingSince).not.toBeNull()
  })

  it('keeps only items the catalog knows (a removed item never breaks the visit)', async () => {
    await visitRoom('friend-1')
    expect(useVisitStore.getState().visiting.layout.placed.map((p) => p.itemId)).toEqual(['desk_basic'])
  })

  it('never touches the visitor’s own layout', async () => {
    await visitRoom('friend-1')
    expect(useRoomStore.getState().layout).toBe(STARTER_LAYOUT)
  })

  it('a friend without a room document is the starter room', async () => {
    m.getDoc.mockResolvedValue({ exists: () => false, data: () => undefined })
    expect(await visitRoom('friend-1')).toEqual({ ok: true })
    expect(useVisitStore.getState().visiting.layout.placed.length).toBeGreaterThan(0)
    expect(useVisitStore.getState().visiting.layout.tier).toBe(0)
  })

  it('visiting yourself does nothing', async () => {
    expect(await visitRoom('me')).toEqual({ ok: false, error: 'SELF' })
    expect(useVisitStore.getState().visiting).toBeNull()
    expect(m.getDoc).not.toHaveBeenCalled()
  })

  it('needs an account and a friend id', async () => {
    m.uid = null
    expect(await visitRoom('friend-1')).toEqual({ ok: false, error: 'SIGN_IN' })
    m.uid = 'me'
    expect(await visitRoom('')).toEqual({ ok: false, error: 'FAILED' })
    expect(await visitRoom(undefined)).toEqual({ ok: false, error: 'FAILED' })
  })

  it('waits while a map is still loading', async () => {
    useSchoolWorldStore.getState().markMapSwitching()
    expect(await visitRoom('friend-1')).toEqual({ ok: false, error: 'BUSY' })
    expect(useVisitStore.getState().visiting).toBeNull()
  })

  it('a failed read changes nothing', async () => {
    m.getDoc.mockRejectedValue(new Error('offline'))
    expect(await visitRoom('friend-1')).toEqual({ ok: false, error: 'FAILED' })
    expect(useVisitStore.getState().visiting).toBeNull()
    expect(useWorldStore.getState().currentMapKey).toBe('campus')
    expect(useSchoolWorldStore.getState().mapChangeRequest).toBeNull()
  })
})

describe('leaveVisit', () => {
  it('goes home to the student’s own room and presence', async () => {
    await visitRoom('friend-1')
    useSchoolWorldStore.getState().clearMapChangeRequest()
    useSchoolWorldStore.setState({ mapSwitchingSince: null })
    await leaveVisit()
    expect(useVisitStore.getState().visiting).toBeNull()
    expect(m.returnHome).toHaveBeenCalledWith('me', 'room')
    expect(useSchoolWorldStore.getState().mapChangeRequest).toMatchObject({ mapKey: 'room' })
  })

  it('is harmless when not visiting', async () => {
    await expect(leaveVisit()).resolves.toBeUndefined()
    expect(m.returnHome).not.toHaveBeenCalled()
  })
})

describe('endVisitOnLeaving (review I1: a portal out of a friend’s room must not leave you in their world)', () => {
  it('ends the visit and puts the student’s presence back home on the map they walk to', async () => {
    await visitRoom('friend-1')
    m.returnHome.mockClear()
    endVisitOnLeaving('school_hub')
    expect(useVisitStore.getState().visiting).toBeNull()
    expect(m.returnHome).toHaveBeenCalledWith('me', 'school_hub')
  })
  it('does nothing for the room itself (the restart keeps the visit) or when not visiting', async () => {
    endVisitOnLeaving('school_hub')
    expect(m.returnHome).not.toHaveBeenCalled()
    await visitRoom('friend-1')
    endVisitOnLeaving('room')
    expect(useVisitStore.getState().visiting).not.toBeNull()
  })
})
