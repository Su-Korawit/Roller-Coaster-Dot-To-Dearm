import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const m = vi.hoisted(() => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  saveRoomLayout: vi.fn(),
  startFocus: vi.fn(),
  checkInFocus: vi.fn(),
  endFocus: vi.fn(),
  abandonFocus: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getDoc: (...a) => m.getDoc(...a),
  getDocs: (...a) => m.getDocs(...a),
}))
vi.mock('../lib/db', () => ({
  refs: { user: (u) => ({ path: 'users/' + u }), room: (u) => ({ path: 'rooms/' + u }) },
  cols: { roomCatalog: { path: 'roomCatalog' } },
  shapes: {
    roomLayout: (d) => ({
      tier: d?.tier ?? 0,
      theme: d?.theme ?? 'minimal',
      placed: d?.placed ?? [],
      petId: d?.petId ?? null,
    }),
  },
}))
vi.mock('../services/roomApi', () => ({
  saveRoomLayout: (...a) => m.saveRoomLayout(...a),
  buyRoomItem: vi.fn(),
  claimWelcomePack: vi.fn(),
}))
vi.mock('../services/focus', () => ({
  startFocus: (...a) => m.startFocus(...a),
  checkInFocus: (...a) => m.checkInFocus(...a),
  endFocus: (...a) => m.endFocus(...a),
  abandonFocus: (...a) => m.abandonFocus(...a),
  CHECKIN_PROMPT_MS: 1500000,
}))

const { useLeavesStore } = await import('./useLeavesStore')
const { useRoomStore, roomSync } = await import('./useRoomStore')
const { useFocusStore } = await import('./useFocusStore')
const { focusProgress } = await import('../room/focusProgress')

const catalog = {
  chair_basic: { kind: 'furniture', footprint: [1, 1] },
  theme_minimal: { kind: 'theme', footprint: [1, 1] },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  m.saveRoomLayout.mockResolvedValue({ ok: true })
  roomSync.cancel()
  useLeavesStore.setState({ leaves: 0, inventory: { chair_basic: 2, theme_minimal: 1 }, welcomePack: null, loaded: true })
  useRoomStore.setState({
    layout: { tier: 0, theme: 'minimal', petId: null, placed: [] },
    catalog,
    decorating: false,
  })
})
afterEach(() => vi.useRealTimers())

describe('useLeavesStore', () => {
  it('hydrates the balance, inventory and welcome flag from the user document', async () => {
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ leaves: 120, roomInventory: { lamp_desk: 1 }, welcomePack: 'v2' }) })
    await useLeavesStore.getState().hydrate('u1')
    expect(useLeavesStore.getState()).toMatchObject({ leaves: 120, inventory: { lamp_desk: 1 }, welcomePack: 'v2', loaded: true })
  })

  it('treats a user without room fields as empty', async () => {
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) })
    await useLeavesStore.getState().hydrate('u1')
    expect(useLeavesStore.getState()).toMatchObject({ leaves: 0, inventory: {}, welcomePack: null })
  })

  it('applies server results without losing the rest', () => {
    useLeavesStore.getState().applyServer({ leaves: 55 })
    expect(useLeavesStore.getState().leaves).toBe(55)
    expect(useLeavesStore.getState().inventory.chair_basic).toBe(2)
    useLeavesStore.getState().applyServer({ inventory: { chair_basic: 3 } })
    expect(useLeavesStore.getState().inventory.chair_basic).toBe(3)
  })
})

describe('useRoomStore.place / pickUp', () => {
  it('places an owned item on a free spot and schedules a save', () => {
    expect(useRoomStore.getState().place('chair_basic', 32, 32)).toBe(true)
    expect(useRoomStore.getState().layout.placed).toEqual([{ itemId: 'chair_basic', x: 32, y: 32 }])
  })

  it('refuses an overlap and keeps the layout as it was', () => {
    useRoomStore.getState().place('chair_basic', 32, 32)
    expect(useRoomStore.getState().place('chair_basic', 32, 32)).toBe(false)
    expect(useRoomStore.getState().layout.placed).toHaveLength(1)
  })

  it('refuses an item the player does not own', () => {
    useLeavesStore.setState({ inventory: { theme_minimal: 1 } })
    expect(useRoomStore.getState().place('chair_basic', 32, 32)).toBe(false)
  })

  it('picks an item up by index', () => {
    useRoomStore.getState().place('chair_basic', 32, 32)
    useRoomStore.getState().pickUp(0)
    expect(useRoomStore.getState().layout.placed).toEqual([])
  })

  it('coalesces quick edits into one save with the final layout', async () => {
    useRoomStore.getState().place('chair_basic', 16, 16)
    useRoomStore.getState().place('chair_basic', 48, 16)
    useRoomStore.getState().pickUp(0)
    await vi.advanceTimersByTimeAsync(2100)
    expect(m.saveRoomLayout).toHaveBeenCalledTimes(1)
    expect(m.saveRoomLayout.mock.calls[0][0].placed).toEqual([{ itemId: 'chair_basic', x: 48, y: 16 }])
  })

  it('does not save when nothing changed', async () => {
    await vi.advanceTimersByTimeAsync(5000)
    expect(roomSync.status).toBe('idle')
    expect(m.saveRoomLayout).not.toHaveBeenCalled()
  })

  it('toggles decorate mode', () => {
    useRoomStore.getState().setDecorating(true)
    expect(useRoomStore.getState().decorating).toBe(true)
  })
})

describe('useRoomStore with a desk and a removed catalog item (review fixes)', () => {
  const deskCatalog = {
    ...catalog,
    desk_basic: { kind: 'desk', footprint: [4, 2] },
    lamp_desk: { kind: 'decor', footprint: [1, 1], deskSlot: true },
  }
  beforeEach(() => {
    useLeavesStore.setState({ inventory: { chair_basic: 2, theme_minimal: 1, desk_basic: 1, lamp_desk: 1 } })
    useRoomStore.setState({
      catalog: deskCatalog,
      layout: { tier: 0, theme: 'minimal', petId: null, placed: [{ itemId: 'desk_basic', x: 32, y: 32 }, { itemId: 'lamp_desk', x: 32, y: 32, slot: 'left' }] },
    })
  })

  it('picking up the desk also picks up what stands on it, so the room stays editable', () => {
    useRoomStore.getState().pickUp(0)
    expect(useRoomStore.getState().layout.placed).toEqual([])
    expect(useRoomStore.getState().place('desk_basic', 64, 64)).toBe(true)
  })

  it('hydrate drops layout entries whose catalog item no longer exists', async () => {
    m.getDocs.mockResolvedValue({ docs: Object.entries(deskCatalog).map(([id, d]) => ({ id, data: () => d })) })
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ tier: 0, theme: 'minimal', placed: [{ itemId: 'chair_basic', x: 8, y: 8 }, { itemId: 'gone_item', x: 48, y: 48 }] }) })
    await useRoomStore.getState().hydrate('u1')
    expect(useRoomStore.getState().layout.placed).toEqual([{ itemId: 'chair_basic', x: 8, y: 8 }])
  })

  it('hydrate keeps everything when the catalog is empty (not seeded yet)', async () => {
    m.getDocs.mockResolvedValue({ docs: [] })
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ tier: 0, theme: 'minimal', placed: [{ itemId: 'gone_item', x: 48, y: 48 }] }) })
    await useRoomStore.getState().hydrate('u1')
    expect(useRoomStore.getState().layout.placed).toHaveLength(1)
  })
})

describe('useRoomStore.hydrate', () => {
  it('loads the catalog and the saved layout', async () => {
    m.getDocs.mockResolvedValue({ docs: [{ id: 'chair_basic', data: () => catalog.chair_basic }] })
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ tier: 0, theme: 'minimal', placed: [{ itemId: 'chair_basic', x: 8, y: 8 }] }) })
    await useRoomStore.getState().hydrate('u1')
    expect(useRoomStore.getState().catalog).toEqual({ chair_basic: catalog.chair_basic })
    expect(useRoomStore.getState().layout.placed).toEqual([{ itemId: 'chair_basic', x: 8, y: 8 }])
  })

  it('keeps the current layout when the room document is missing', async () => {
    m.getDocs.mockResolvedValue({ docs: [] })
    m.getDoc.mockResolvedValue({ exists: () => false })
    await useRoomStore.getState().hydrate('u1')
    expect(useRoomStore.getState().layout.placed).toEqual([])
  })
})

describe('useFocusStore', () => {
  beforeEach(() => useFocusStore.getState().reset())

  it('starts with the chosen mode and planned time', async () => {
    m.startFocus.mockResolvedValue({ ok: true, mode: 'strict', plannedMin: 50, startedAt: 1000, lastCheckInAt: 1000, verifiedMs: 0 })
    await useFocusStore.getState().start({ mode: 'strict', plannedMin: 50 })
    expect(m.startFocus).toHaveBeenCalledWith({ mode: 'strict', plannedMin: 50 })
    expect(useFocusStore.getState()).toMatchObject({ status: 'running', mode: 'strict', plannedMin: 50, startedAt: 1000 })
  })

  it('starts a practice session and remembers that it is one', async () => {
    m.startFocus.mockResolvedValue({ ok: true, practice: true, mode: 'flexible', plannedMin: 1, startedAt: 5, lastCheckInAt: 5, verifiedMs: 0 })
    await useFocusStore.getState().start({ practice: true })
    expect(m.startFocus).toHaveBeenCalledWith({ mode: undefined, plannedMin: undefined, practice: true })
    expect(useFocusStore.getState()).toMatchObject({ status: 'running', practice: true, plannedMin: 1 })
  })

  it('ending a session stores the result and adds the Leaves to the balance', async () => {
    useFocusStore.setState({ status: 'running', mode: 'flexible', plannedMin: 25, startedAt: 0 })
    m.endFocus.mockResolvedValue({ ok: true, leaves: 27, tree: 'shrub', withered: false })
    await useFocusStore.getState().end()
    expect(useFocusStore.getState()).toMatchObject({ status: 'done', result: { leaves: 27, tree: 'shrub' } })
    expect(useLeavesStore.getState().leaves).toBe(27)
  })

  it('abandoning marks the tree withered', async () => {
    useFocusStore.setState({ status: 'running', mode: 'strict', plannedMin: 25, startedAt: 0 })
    m.abandonFocus.mockResolvedValue({ ok: true, leaves: 0, tree: 'withered', withered: true })
    await useFocusStore.getState().abandon()
    expect(useFocusStore.getState()).toMatchObject({ status: 'withered', result: { tree: 'withered' } })
    expect(useLeavesStore.getState().leaves).toBe(0)
  })

  it('a lapsed check-in in a strict session turns the store withered', async () => {
    useFocusStore.setState({ status: 'running', mode: 'strict', plannedMin: 25, startedAt: 0 })
    m.checkInFocus.mockResolvedValue({ ok: true, lastCheckInAt: 5, verifiedMs: 0, withered: true })
    m.abandonFocus.mockResolvedValue({ ok: true, leaves: 0, tree: 'withered', withered: true })
    await useFocusStore.getState().checkIn()
    expect(useFocusStore.getState().status).toBe('withered')
  })

  it('keeps running when a call fails and records the error', async () => {
    useFocusStore.setState({ status: 'running', mode: 'flexible', plannedMin: 25, startedAt: 0 })
    m.checkInFocus.mockRejectedValue(new Error('offline'))
    await useFocusStore.getState().checkIn().catch(() => {})
    expect(useFocusStore.getState().status).toBe('running')
  })
})

describe('useFocusStore settling (review fixes)', () => {
  beforeEach(() => useFocusStore.getState().reset())
  const running = (mode = 'strict') => useFocusStore.setState({ status: 'running', mode, plannedMin: 25, startedAt: 0 })

  it('end after abandon started does nothing: only one settle call reaches the server', async () => {
    running()
    let release
    m.abandonFocus.mockReturnValue(new Promise((r) => { release = r }))
    const first = useFocusStore.getState().abandon('hidden')
    expect(await useFocusStore.getState().end()).toBeNull()
    expect(m.endFocus).not.toHaveBeenCalled()
    release({ ok: true, leaves: 0, tree: 'withered', withered: true })
    await first
    expect(useFocusStore.getState().status).toBe('withered')
  })

  it('a failed settle returns to running so it can be retried', async () => {
    running('flexible')
    m.endFocus.mockRejectedValueOnce(new Error('offline'))
    await expect(useFocusStore.getState().end()).rejects.toThrow('offline')
    expect(useFocusStore.getState().status).toBe('running')
  })

  it('NO_ACTIVE_SESSION on end resets to idle instead of freezing the HUD', async () => {
    running('flexible')
    m.endFocus.mockRejectedValueOnce(Object.assign(new Error('NO_ACTIVE_SESSION'), { code: 'functions/failed-precondition' }))
    expect(await useFocusStore.getState().end()).toBeNull()
    expect(useFocusStore.getState().status).toBe('idle')
  })

  it('starting onto a resumed strict session settles it as withered', async () => {
    m.startFocus.mockResolvedValue({ ok: true, resumed: true, withered: true, mode: 'strict', plannedMin: 25, startedAt: 1, lastCheckInAt: 1, verifiedMs: 0 })
    m.abandonFocus.mockResolvedValue({ ok: true, leaves: 0, tree: 'withered', withered: true })
    await useFocusStore.getState().start({ mode: 'strict', plannedMin: 25 })
    expect(m.abandonFocus).toHaveBeenCalled()
    expect(useFocusStore.getState().status).toBe('withered')
  })
})

describe('focusProgress', () => {
  it('is only due for auto-end a short grace after the planned time (clock skew)', async () => {
    const { isDue } = await import('../room/focusProgress')
    expect(isDue({ startedAt: 0, plannedMin: 10, now: 600000 })).toBe(false)
    expect(isDue({ startedAt: 0, plannedMin: 10, now: 603000 })).toBe(true)
  })

  it('is elapsed over planned, clamped to 0..1, from timestamps', () => {
    expect(focusProgress({ startedAt: 0, plannedMin: 10, now: 0 })).toBe(0)
    expect(focusProgress({ startedAt: 0, plannedMin: 10, now: 300000 })).toBe(0.5)
    expect(focusProgress({ startedAt: 0, plannedMin: 10, now: 9e9 })).toBe(1)
    expect(focusProgress({ startedAt: 1000, plannedMin: 10, now: 0 })).toBe(0)
    expect(focusProgress({ startedAt: null, plannedMin: 10, now: 5 })).toBe(0)
  })
})

describe('useRoomStore decorating by tapping', () => {
  beforeEach(() => {
    useRoomStore.setState({ decorating: true, selected: null, lastError: null })
  })

  it('remembers why a placement was refused and clears it on success', () => {
    useRoomStore.getState().place('chair_basic', 32, 32)
    expect(useRoomStore.getState().place('chair_basic', 32, 32)).toBe(false)
    expect(useRoomStore.getState().lastError).toBe('overlap')
    expect(useRoomStore.getState().place('chair_basic', 64, 64)).toBe(true)
    expect(useRoomStore.getState().lastError).toBeNull()
  })

  it('reports not_owned when the player has no copy left', () => {
    useLeavesStore.setState({ inventory: { theme_minimal: 1 } })
    useRoomStore.getState().place('chair_basic', 32, 32)
    expect(useRoomStore.getState().lastError).toBe('not_owned')
  })

  it('places the selected item where the room is tapped', () => {
    useRoomStore.getState().selectItem('chair_basic')
    expect(useRoomStore.getState().tapRoom(60, 70)).toBe(true)
    expect(useRoomStore.getState().layout.placed).toEqual([{ itemId: 'chair_basic', x: 56, y: 64 }])
  })

  it('picks up the item under the tap when nothing is selected', () => {
    useRoomStore.getState().place('chair_basic', 32, 32)
    expect(useRoomStore.getState().tapRoom(40, 40)).toBe(true)
    expect(useRoomStore.getState().layout.placed).toEqual([])
  })

  it('does nothing on an empty tap with nothing selected', () => {
    expect(useRoomStore.getState().tapRoom(40, 40)).toBe(false)
  })

  it('leaving decorate mode drops the selection and the error', () => {
    useRoomStore.setState({ selected: 'chair_basic', lastError: 'overlap' })
    useRoomStore.getState().setDecorating(false)
    expect(useRoomStore.getState()).toMatchObject({ decorating: false, selected: null, lastError: null })
  })
})

describe('Guide events from the stores', () => {
  beforeEach(() => {
    useFocusStore.getState().reset()
    useLeavesStore.setState({ practiceDone: false })
  })

  it('a successful placement emits "placed" and a refused one does not', async () => {
    const { onGuideEvent } = await import('../lib/guideEvents')
    const seen = []
    const off = onGuideEvent((e) => seen.push(e))
    useRoomStore.getState().place('chair_basic', 32, 32)
    useRoomStore.getState().place('chair_basic', 32, 32) // overlap: refused
    off()
    expect(seen).toEqual(['placed'])
  })

  it('a rewarded practice session emits "practiced" and remembers the gift was paid', async () => {
    const { onGuideEvent } = await import('../lib/guideEvents')
    const seen = []
    const off = onGuideEvent((e) => seen.push(e))
    useFocusStore.setState({ status: 'running', practice: true, mode: 'flexible', plannedMin: 1, startedAt: 0 })
    m.endFocus.mockResolvedValue({ ok: true, leaves: 10, tree: 'sprout', withered: false, practice: true })
    await useFocusStore.getState().end()
    off()
    expect(seen).toEqual(['practiced'])
    expect(useLeavesStore.getState().practiceDone).toBe(true)
  })

  it('a practice session that paid nothing does not advance the Guide', async () => {
    const { onGuideEvent } = await import('../lib/guideEvents')
    const seen = []
    const off = onGuideEvent((e) => seen.push(e))
    useFocusStore.setState({ status: 'running', practice: true, mode: 'flexible', plannedMin: 1, startedAt: 0 })
    m.endFocus.mockResolvedValue({ ok: true, leaves: 0, tree: 'sprout', withered: false, practice: true })
    await useFocusStore.getState().end()
    off()
    expect(seen).toEqual([])
    expect(useLeavesStore.getState().practiceDone).toBe(false)
  })
})
