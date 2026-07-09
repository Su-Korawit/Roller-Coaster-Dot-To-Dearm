import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEntitlementsStore } from './useEntitlementsStore'
import { FREE_PLAN_SLOTS } from '../constants/entitlements'

let seq = 0
const nextId = () => `plan-${++seq}-${Date.now()}`

export const usePlansStore = create(
  persist(
    (set, get) => ({
      plans: [],
      activePlanId: null,

      // Capped at the free tier + purchased plan-slot entitlements; returns
      // null when at capacity so the UI can point to the shop Unlock section.
      addPlan: () => {
        const cap = FREE_PLAN_SLOTS + useEntitlementsStore.getState().extraPlanSlots()
        if (get().plans.length >= cap) return null
        const plan = { id: nextId(), university: null, program: null, addedAt: Date.now() }
        set((s) => ({ plans: [...s.plans, plan], activePlanId: plan.id }))
        return plan.id
      },

      updatePlan: (id, patch) =>
        set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      removePlan: (id) =>
        set((s) => {
          const plans = s.plans.filter((p) => p.id !== id)
          const activePlanId = s.activePlanId === id ? (plans[0]?.id ?? null) : s.activePlanId
          return { plans, activePlanId }
        }),

      setActivePlan: (id) => set({ activePlanId: id }),

      reorderPlans: (from, to) =>
        set((s) => {
          const plans = [...s.plans]
          const [moved] = plans.splice(from, 1)
          plans.splice(to, 0, moved)
          return { plans }
        }),

      resetPlans: () => set({ plans: [], activePlanId: null }),
    }),
    { name: 'rc-plans-store' },
  ),
)
