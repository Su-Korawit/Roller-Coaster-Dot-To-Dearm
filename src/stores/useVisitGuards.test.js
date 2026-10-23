import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(), getDocs: vi.fn() }))
vi.mock('../lib/db', () => ({ refs: {}, cols: {}, shapes: {} }))
vi.mock('../services/roomApi', () => ({ saveRoomLayout: vi.fn().mockResolvedValue({ ok: true }), buyRoomItem: vi.fn(), claimWelcomePack: vi.fn() }))
vi.mock('../services/focus', () => ({ startFocus: vi.fn().mockResolvedValue({ mode: 'flexible', plannedMin: 25, startedAt: 1, lastCheckInAt: 1 }), checkInFocus: vi.fn(), endFocus: vi.fn(), abandonFocus: vi.fn(), CHECKIN_PROMPT_MS: 1 }))

const { useRoomStore, roomSync } = await import('./useRoomStore')
const { useLeavesStore } = await import('./useLeavesStore')
const { useVisitStore } = await import('./useVisitStore')
const { useRoomUiStore } = await import('./useRoomUiStore')
const { useFocusStore } = await import('./useFocusStore')
const { useFxStore } = await import('./useFxStore')
const { currentRoomView, currentAvatar } = await import('../room/currentLayout')
const { ROOM_CATALOG, STARTER_ITEMS } = await import('../data/roomCatalogSeed')
const { STARTER_LAYOUT } = await import('../room/defaultLayout')

const theirs = { tier: 1, theme: 'cafe', petId: 'pet_shiba', placed: [{ itemId: 'desk_basic', x: 96, y: 32 }] }

beforeEach(() => {
  roomSync.cancel()
  useVisitStore.getState().end()
  useFxStore.setState({ toasts: [] })
  useRoomUiStore.getState().close()
  useFocusStore.getState().reset()
  useRoomStore.setState({ layout: STARTER_LAYOUT, catalog: ROOM_CATALOG, decorating: false, selected: null, lastError: null })
  useLeavesStore.setState({ inventory: { ...STARTER_ITEMS, chair_basic: 3, tier_1: 1, theme_cafe: 1, pet_shiba: 1 }, leaves: 500, avatar: { accessories: { head: 'acc_cap' }, outfitHue: 10 } })
})

describe('what the scene draws while visiting', () => {
  it('is the friend’s room, read-only; the student’s own room otherwise', () => {
    expect(currentRoomView()).toMatchObject({ readOnly: false, layout: STARTER_LAYOUT })
    useVisitStore.getState().begin({ ownerUid: 'friend-1', layout: theirs })
    expect(currentRoomView()).toMatchObject({ readOnly: true, ownerUid: 'friend-1', layout: theirs })
  })

  it('the visitor keeps their own outfit (the friend’s wardrobe is not applied to them)', () => {
    useVisitStore.getState().begin({ ownerUid: 'friend-1', layout: theirs })
    expect(currentAvatar()).toEqual({ accessories: { head: 'acc_cap' }, outfitHue: 10 })
  })
})

describe('a visitor cannot edit', () => {
  beforeEach(() => useVisitStore.getState().begin({ ownerUid: 'friend-1', layout: theirs }))

  it('place, pick up, tap and style changes are all refused and change nothing', () => {
    const before = useRoomStore.getState().layout
    expect(useRoomStore.getState().place('chair_basic', 32, 32)).toBe(false)
    useRoomStore.getState().pickUp(0)
    expect(useRoomStore.getState().tapRoom(40, 40)).toBe(false)
    expect(useRoomStore.getState().setTheme('cafe')).toBe(false)
    expect(useRoomStore.getState().setTier(1)).toBe(false)
    expect(useRoomStore.getState().setPet('pet_shiba')).toBe(false)
    expect(useRoomStore.getState().layout).toBe(before)
    expect(useRoomStore.getState().lastError).toBe('visiting')
  })

  it('decorate mode cannot be turned on', () => {
    useRoomStore.getState().setDecorating(true)
    expect(useRoomStore.getState().decorating).toBe(false)
  })

  it('the shop, wardrobe and focus sheets do not open, with a reason', () => {
    for (const sheet of ['shop', 'wardrobe', 'focus']) {
      useRoomUiStore.getState().open(sheet)
      expect(useRoomUiStore.getState().sheet, sheet).toBeNull()
    }
    expect(useFxStore.getState().toasts.map((t) => t.text)).toContain('กำลังเยี่ยมห้องเพื่อน กลับห้องของฉันก่อน')
  })

  it('other sheets (warp, bag, plan, history) still open', () => {
    for (const sheet of ['warp', 'bag', 'plan', 'history']) {
      useRoomUiStore.getState().open(sheet)
      expect(useRoomUiStore.getState().sheet, sheet).toBe(sheet)
    }
  })

  it('a focus session cannot be started', async () => {
    await expect(useFocusStore.getState().start({ mode: 'flexible', plannedMin: 25 })).rejects.toThrow()
    expect(useFocusStore.getState().status).toBe('idle')
  })

  it('after the visit everything works again', () => {
    useVisitStore.getState().end()
    useRoomStore.getState().setDecorating(true)
    expect(useRoomStore.getState().decorating).toBe(true)
    expect(useRoomStore.getState().place('chair_basic', 32, 32)).toBe(true)
  })
})
