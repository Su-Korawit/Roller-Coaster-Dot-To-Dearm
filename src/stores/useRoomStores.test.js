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

describe('focusProgress', () => {
  it('is elapsed over planned, clamped to 0..1, from timestamps', () => {
    expect(focusProgress({ startedAt: 0, plannedMin: 10, now: 0 })).toBe(0)
    expect(focusProgress({ startedAt: 0, plannedMin: 10, now: 300000 })).toBe(0.5)
    expect(focusProgress({ startedAt: 0, plannedMin: 10, now: 9e9 })).toBe(1)
    expect(focusProgress({ startedAt: 1000, plannedMin: 10, now: 0 })).toBe(0)
    expect(focusProgress({ startedAt: null, plannedMin: 10, now: 5 })).toBe(0)
  })
})
