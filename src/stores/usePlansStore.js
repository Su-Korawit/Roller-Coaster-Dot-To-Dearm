import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEntitlementsStore } from './useEntitlementsStore'
import { FREE_PLAN_SLOTS } from '../constants/entitlements'
import {
  RANK_MAX, PLAN_VERSION, autoChecklist, mergeChecklist, isSubjectKey,
  nextFreeRank, normalizeRanks, migrateEntry,
} from '../utils/planDerive'

let seq = 0
const nextId = () => `plan-${++seq}-${Date.now()}`
const isRound = (r) => r === 1 || r === 2 || r === 3 || r === 4
const MAX_ITEM_TEXT = 120
const GOAL_MAX_HOURS = 500

const cap = () => FREE_PLAN_SLOTS + useEntitlementsStore.getState().extraPlanSlots()

// Valid goal hours only; anything else from storage or the cloud is dropped.
const cleanGoals = (goals) => {
  const out = {}
  if (goals && typeof goals === 'object') {
    for (const [k, v] of Object.entries(goals)) {
      if (isSubjectKey(k) && Number.isInteger(v) && v >= 1 && v <= GOAL_MAX_HOURS) out[k] = v
    }
  }
  return out
}

// Old, partial and malformed entries become valid v2 entries; ranks are repaired.
const cleanPlans = (plans) => normalizeRanks((Array.isArray(plans) ? plans : []).map(migrateEntry).filter(Boolean))

// Plan state from a profile read (readProfile): old shapes upgraded, ranks and goals repaired.
export const planStateFromProfile = ({ plans, activePlanId, goalHours } = {}) => {
  const clean = cleanPlans(plans)
  return {
    plans: clean,
    activePlanId: clean.some((p) => p.id === activePlanId) ? activePlanId : (clean[0]?.id ?? null),
    goalHours: cleanGoals(goalHours),
  }
}

const replaceEntry = (plans, id, fn) => {
  let hit = false
  const next = plans.map((p) => {
    if (p.id !== id) return p
    hit = true
    return fn(p)
  })
  return hit ? next : plans
}

export const usePlansStore = create(
  persist(
    (set, get) => ({
      plans: [],
      activePlanId: null,
      goalHours: {}, // { [subjectKey]: hours } — the student's own goals; defaults come from planDerive

      // Capped at the free tier + purchased plan-slot entitlements; returns
      // null when at capacity so the UI can point to the shop Unlock section.
      addPlan: () => {
        if (get().plans.length >= cap()) return null
        const plan = migrateEntry({ id: nextId(), university: null, program: null, addedAt: Date.now() })
        set((s) => ({ plans: [...s.plans, plan], activePlanId: plan.id }))
        return plan.id
      },

      // The Plan flow: add a program from the Open House popup to a round. The project data
      // (min GPAX, score weights) is copied so the plan never has to re-fetch the index.
      addFromProgram: ({ universityId, universityName, programId, programName, buildingId, round, projectName, minGpax, scores }) => {
        if (!programId || typeof programId !== 'string') return { ok: false, reason: 'bad_program' }
        // round null = "not chosen yet" (the student can plan the program first and pick a round later)
        if (round !== null && !isRound(round)) return { ok: false, reason: 'bad_round' }
        const { plans } = get()
        if (plans.some((p) => p.programId === programId && p.round === round)) return { ok: false, reason: 'duplicate' }
        if (plans.length >= cap()) return { ok: false, reason: 'cap' }
        const rank = round === 3 ? nextFreeRank(plans) : null
        if (round === 3 && rank === null) return { ok: false, reason: 'rank_full' }
        const entry = migrateEntry({
          id: nextId(),
          addedAt: Date.now(),
          university: universityId ?? null,
          program: programId,
          universityId: universityId ?? null,
          universityName: universityName ?? null,
          programId,
          programName: programName ?? null,
          buildingId: buildingId ?? null,
          round,
          rank,
          projectName: projectName ?? null,
          minGpax,
          scores,
          checklist: autoChecklist({ round, minGpax, scores }),
        })
        set((s) => ({ plans: [...s.plans, entry], activePlanId: entry.id }))
        return { ok: true, id: entry.id, rank }
      },

      // Move an entry to another round (null = "not chosen yet"). Round 3 takes the next free
      // rank; leaving it closes the gap. The checklist is regenerated but keeps what was ticked.
      setRound: (id, round, project) => {
        const entry = get().plans.find((p) => p.id === id)
        if (!entry) return { ok: false, reason: 'unknown' }
        if (round !== null && !isRound(round)) return { ok: false, reason: 'bad_round' }
        let rank = null
        if (round === 3) {
          rank = entry.round === 3 ? entry.rank : nextFreeRank(get().plans.filter((p) => p.id !== id))
          if (rank === null) return { ok: false, reason: 'rank_full' }
        }
        const minGpax = project?.minGpax ?? entry.minGpax
        const scores = project?.scores ?? entry.scores
        set((s) => ({
          plans: normalizeRanks(replaceEntry(s.plans, id, (p) => ({
            ...p,
            round,
            rank,
            projectName: project?.projectName ?? p.projectName,
            minGpax: Number.isFinite(minGpax) ? minGpax : null,
            scores,
            checklist: round ? mergeChecklist(p.checklist, autoChecklist({ round, minGpax, scores })) : p.checklist,
          }))),
        }))
        return { ok: true }
      },

      // Drag-to-rank in round 3: indices are positions in the rank-ordered round-3 list.
      reorderRound3: (from, to) =>
        set((s) => {
          const ordered = s.plans.filter((p) => p.round === 3).sort((a, b) => a.rank - b.rank)
          if (!Number.isInteger(from) || !Number.isInteger(to)) return s
          if (from < 0 || to < 0 || from >= ordered.length || to >= ordered.length || from === to) return s
          const [moved] = ordered.splice(from, 1)
          ordered.splice(to, 0, moved)
          const rankById = new Map(ordered.map((p, i) => [p.id, i + 1]))
          return { plans: s.plans.map((p) => (rankById.has(p.id) ? { ...p, rank: rankById.get(p.id) } : p)) }
        }),

      toggleChecklist: (id, itemId) =>
        set((s) => {
          const plans = replaceEntry(s.plans, id, (p) => ({
            ...p,
            checklist: p.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)),
          }))
          return plans === s.plans ? s : { plans }
        }),

      addChecklistItem: (id, text) => {
        const clean = typeof text === 'string' ? text.trim() : ''
        if (!clean || clean.length > MAX_ITEM_TEXT || !get().plans.some((p) => p.id === id)) return null
        const itemId = `user:${++seq}-${Date.now()}`
        set((s) => ({
          plans: replaceEntry(s.plans, id, (p) => ({ ...p, checklist: [...p.checklist, { id: itemId, text: clean, done: false, source: 'user' }] })),
        }))
        return itemId
      },

      // Only the student's own items can be deleted; automatic ones come back with the round.
      removeChecklistItem: (id, itemId) =>
        set((s) => ({
          plans: replaceEntry(s.plans, id, (p) => ({
            ...p,
            checklist: p.checklist.filter((c) => !(c.id === itemId && c.source === 'user')),
          })),
        })),

      setGoalHours: (key, hours) => {
        if (!isSubjectKey(key) || !Number.isInteger(hours) || hours < 1 || hours > GOAL_MAX_HOURS) return
        set((s) => ({ goalHours: { ...s.goalHours, [key]: hours } }))
      },

      updatePlan: (id, patch) =>
        set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      removePlan: (id) =>
        set((s) => {
          const plans = normalizeRanks(s.plans.filter((p) => p.id !== id))
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

      // Load from the cloud profile: Firestore wins, old shapes are upgraded here.
      hydrate: (profile) => set(planStateFromProfile(profile)),

      resetPlans: () => set({ plans: [], activePlanId: null, goalHours: {} }),
    }),
    {
      name: 'rc-plans-store',
      version: PLAN_VERSION,
      // Entries saved before the Plan (v1) have no round/checklist/scores: upgrade them in place.
      migrate: (persisted) => ({
        ...persisted,
        plans: cleanPlans(persisted?.plans),
        goalHours: cleanGoals(persisted?.goalHours),
      }),
    },
  ),
)

export { RANK_MAX }
