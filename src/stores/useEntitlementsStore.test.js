import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ getDocs: vi.fn(), callable: vi.fn(), setCoins: vi.fn() }))

vi.mock('firebase/firestore', () => ({ getDocs: (...a) => m.getDocs(...a) }))
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => (data) => m.callable(data),
}))
vi.mock('../lib/db', () => ({
  queries: { activeEntitlements: () => ({ _query: 'active' }) },
}))
vi.mock('./useUserStore', () => ({
  useUserStore: { getState: () => ({ setCoins: m.setCoins }) },
}))

const { useEntitlementsStore } = await import('./useEntitlementsStore')

describe('useEntitlementsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEntitlementsStore.setState({ entitlements: {}, catalog: [], catalogLoading: false })
  })

  it('hydrates and answers has()', () => {
    useEntitlementsStore.getState().hydrateEntitlements({ 'pack-1': { kind: 'sticker-pack' } })
    expect(useEntitlementsStore.getState().has('pack-1')).toBe(true)
    expect(useEntitlementsStore.getState().has('pack-2')).toBe(false)
  })

  it('derives extraPlanSlots and aiDailyCap from payloads', () => {
    useEntitlementsStore.getState().hydrateEntitlements({
      slots: { kind: 'plan-slots', payload: { extraSlots: 3 } },
      quota: { kind: 'ai-quota', payload: { dailyBonus: 5 } },
    })
    expect(useEntitlementsStore.getState().extraPlanSlots()).toBe(3)
    expect(useEntitlementsStore.getState().aiDailyCap()).toBe(3 + 5) // FREE_AI_DAILY + bonus
  })

  it('ownedStickers flattens sticker-pack payloads', () => {
    useEntitlementsStore.getState().hydrateEntitlements({
      pack: { kind: 'sticker-pack', payload: { stickers: [{ id: 's1', label: 'x', url: 'u' }] } },
    })
    expect(useEntitlementsStore.getState().ownedStickers()).toEqual([{ id: 's1', label: 'x', url: 'u' }])
  })

  it('loadCatalog fetches active items', async () => {
    m.getDocs.mockResolvedValue({ docs: [{ id: 'i1', data: () => ({ name: 'Pack', priceCoins: 50, active: true }) }] })
    await useEntitlementsStore.getState().loadCatalog()
    expect(m.getDocs).toHaveBeenCalledWith({ _query: 'active' })
    expect(useEntitlementsStore.getState().catalog).toEqual([{ id: 'i1', name: 'Pack', priceCoins: 50, active: true }])
  })

  it('purchase grants locally and updates the coin balance on success', async () => {
    useEntitlementsStore.setState({ catalog: [{ id: 'i1', kind: 'ai-quota', payload: { dailyBonus: 5 } }] })
    m.callable.mockResolvedValue({ data: { ok: true, newBalance: 120, itemId: 'i1' } })
    await useEntitlementsStore.getState().purchase('i1')
    expect(m.callable).toHaveBeenCalledWith({ itemId: 'i1' })
    expect(useEntitlementsStore.getState().has('i1')).toBe(true)
    expect(m.setCoins).toHaveBeenCalledWith(120)
  })

  it('purchase surfaces INSUFFICIENT_COINS and grants nothing', async () => {
    m.callable.mockRejectedValue(Object.assign(new Error('INSUFFICIENT_COINS')))
    await expect(useEntitlementsStore.getState().purchase('i1')).rejects.toThrow('INSUFFICIENT_COINS')
    expect(useEntitlementsStore.getState().has('i1')).toBe(false)
    expect(m.setCoins).not.toHaveBeenCalled()
  })
})
