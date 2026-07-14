import { create } from 'zustand'
import { getDocs } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { queries } from '../lib/db'
import { useUserStore } from './useUserStore'
import { FREE_AI_DAILY } from '../constants/entitlements'

const owned = (entitlements, kind) =>
  Object.values(entitlements).filter((e) => e?.kind === kind)

export const useEntitlementsStore = create((set, get) => ({
  entitlements: {}, // users/{uid}.entitlements — Functions-owned, hydrated by sessionBootstrap
  catalog: [],
  catalogLoading: false,

  hydrateEntitlements: (map) => set({ entitlements: map ?? {} }),

  has: (itemId) => Boolean(get().entitlements[itemId]),
  extraPlanSlots: () =>
    owned(get().entitlements, 'plan-slots').reduce((sum, e) => sum + (e.payload?.extraSlots ?? 0), 0),
  aiDailyCap: () =>
    FREE_AI_DAILY + owned(get().entitlements, 'ai-quota').reduce((sum, e) => sum + (e.payload?.dailyBonus ?? 0), 0),
  ownedStickers: () =>
    owned(get().entitlements, 'sticker-pack').flatMap((e) => e.payload?.stickers ?? []),
  extraStorageBytes: () =>
    owned(get().entitlements, 'storage-quota').reduce(
      (sum, e) => sum + (e.payload?.extraBytes ?? 0),
      0,
    ),

  loadCatalog: async () => {
    set({ catalogLoading: true })
    try {
      const snap = await getDocs(queries.activeEntitlements())
      set({ catalog: snap.docs.map((d) => ({ id: d.id, ...d.data() })), catalogLoading: false })
    } catch (error) {
      console.error('[entitlements] catalog load failed:', error)
      set({ catalogLoading: false })
    }
  },

  // Server-authoritative spend: the Cloud Function debits coins and grants the
  // entitlement in one transaction; on success we mirror the grant locally and
  // adopt the returned balance (never decrement coins client-side).
  purchase: async (itemId) => {
    const call = httpsCallable(getFunctions(), 'purchaseEntitlement')
    const { data } = await call({ itemId })
    const item = get().catalog.find((c) => c.id === itemId)
    set((s) => ({
      entitlements: {
        ...s.entitlements,
        [itemId]: { kind: item?.kind ?? null, payload: item?.payload ?? null },
      },
    }))
    useUserStore.getState().setCoins(data.newBalance)
    return data
  },
}))
