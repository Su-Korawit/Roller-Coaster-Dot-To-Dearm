import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ saveRoomLayout: vi.fn() }))
vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(), getDocs: vi.fn() }))
vi.mock('../lib/db', () => ({ refs: {}, cols: {}, shapes: {} }))
vi.mock('../services/roomApi', () => ({ saveRoomLayout: (...a) => m.saveRoomLayout(...a), buyRoomItem: vi.fn(), claimWelcomePack: vi.fn() }))

const { useLeavesStore } = await import('./useLeavesStore')
const { useRoomStore, roomSync } = await import('./useRoomStore')
const { ROOM_CATALOG } = await import('../data/roomCatalogSeed')
const { STARTER_LAYOUT } = await import('../room/defaultLayout')

const base = { desk_basic: 1, chair_basic: 1, bed_basic: 1, bookshelf_basic: 1, lamp_desk: 1, plant_small: 1, rug_round: 1, theme_minimal: 1 }
const own = (extra = {}) => useLeavesStore.setState({ inventory: { ...base, ...extra } })

beforeEach(() => {
  roomSync.cancel()
  vi.clearAllMocks()
  m.saveRoomLayout.mockResolvedValue({ ok: true })
  useRoomStore.setState({ layout: STARTER_LAYOUT, catalog: ROOM_CATALOG, lastError: null, decorating: false })
  own()
})

describe('room style actions (tier, theme, pet)', () => {
  it('applies an owned tier and schedules one save', async () => {
    own({ tier_1: 1 })
    expect(useRoomStore.getState().setTier(1)).toBe(true)
    expect(useRoomStore.getState().layout.tier).toBe(1)
    await roomSync.flush?.()
    expect(m.saveRoomLayout).toHaveBeenCalledTimes(1)
  })

  it('refuses a tier that is not owned, and says why', () => {
    expect(useRoomStore.getState().setTier(2)).toBe(false)
    expect(useRoomStore.getState().layout.tier).toBe(0)
    expect(useRoomStore.getState().lastError).toBe('bad_tier')
  })

  it('refuses a downgrade that would strand furniture (nothing is deleted silently)', () => {
    own({ tier_1: 1, chair_basic: 2 })
    useRoomStore.getState().setTier(1)
    useRoomStore.getState().place('chair_basic', 176, 32) // past the old 11-tile edge
    expect(useRoomStore.getState().layout.placed.some((p) => p.x === 176)).toBe(true)
    expect(useRoomStore.getState().setTier(0)).toBe(false)
    expect(useRoomStore.getState().layout.tier).toBe(1)
    expect(useRoomStore.getState().lastError).toBe('out_of_bounds')
  })

  it('applies an owned theme and refuses one that is not owned', () => {
    expect(useRoomStore.getState().setTheme('cafe')).toBe(false)
    expect(useRoomStore.getState().lastError).toBe('bad_theme')
    own({ theme_cafe: 1 })
    expect(useRoomStore.getState().setTheme('cafe')).toBe(true)
    expect(useRoomStore.getState().layout.theme).toBe('cafe')
  })

  it('applies an owned pet, removes it with null, and refuses an item that is not a pet', () => {
    own({ pet_shiba: 1 })
    expect(useRoomStore.getState().setPet('pet_shiba')).toBe(true)
    expect(useRoomStore.getState().layout.petId).toBe('pet_shiba')
    expect(useRoomStore.getState().setPet(null)).toBe(true)
    expect(useRoomStore.getState().layout.petId).toBeNull()
    expect(useRoomStore.getState().setPet('desk_basic')).toBe(false)
    expect(useRoomStore.getState().lastError).toBe('bad_pet')
  })

  it('a refusal leaves the layout object untouched and schedules no save', async () => {
    const before = useRoomStore.getState().layout
    useRoomStore.getState().setTheme('night_sky')
    expect(useRoomStore.getState().layout).toBe(before)
    await roomSync.flush?.()
    expect(m.saveRoomLayout).not.toHaveBeenCalled()
  })
})
