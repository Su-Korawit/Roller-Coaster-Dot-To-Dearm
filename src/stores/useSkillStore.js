import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Max passive equipped slots — unlock by streak milestones
const MAX_PASSIVE_SLOTS = 3
const MAX_ACTIVE_EQUIPPED = 4

// Stacks required to unlock each passive slot
export const PASSIVE_UNLOCK_THRESHOLDS = [1, 3, 7]

export const useSkillStore = create(
  persist(
    (set, get) => ({
      // ids of skills the user has purchased
      ownedSkills: [],
      // passive slot array (up to 3 ids, null = empty)
      equippedPassive: [null, null, null],
      // active equipped skill ids (up to 4)
      equippedActive: [],
      // ── DnD single-slot equipped skills ──────────────────
      equippedPassiveSkill: null, // skill id or null
      equippedActiveSkill: null,  // skill id or null
      // 3-slot passive system: each slot has { equippedSkillId: string|null }
      // Slot unlock thresholds are defined in PASSIVE_UNLOCK_THRESHOLDS
      passiveSlots: [
        { equippedSkillId: null },
        { equippedSkillId: null },
        { equippedSkillId: null },
      ],
      // Derived flag — true when the Planner passive skill is the equipped passive
      isPlannerActive: false,
      setEquippedPassiveSkill: (id) => set({ equippedPassiveSkill: id, isPlannerActive: id === 'planner' }),
      setEquippedActiveSkill: (id) => set({ equippedActiveSkill: id }),

      // Equip a skill into a specific slot (0/1/2). Skill must be unlocked.
      // A skill can only live in one slot at a time.
      equipPassiveSkill: (skillId, slotIndex) =>
        set((state) => {
          if (slotIndex < 0 || slotIndex >= MAX_PASSIVE_SLOTS) return state
          const slots = state.passiveSlots.map((s) => ({ ...s }))
          // Remove the skill from any other slot first
          for (let i = 0; i < slots.length; i++) {
            if (slots[i].equippedSkillId === skillId) slots[i].equippedSkillId = null
          }
          slots[slotIndex].equippedSkillId = skillId
          const isPlannerActive = slots.some((s) => s.equippedSkillId === 'planner')
          return { passiveSlots: slots, isPlannerActive }
        }),

      // Remove whatever skill is in the given slot
      clearPassiveSlot: (slotIndex) =>
        set((state) => {
          if (slotIndex < 0 || slotIndex >= MAX_PASSIVE_SLOTS) return state
          const slots = state.passiveSlots.map((s) => ({ ...s }))
          slots[slotIndex].equippedSkillId = null
          const isPlannerActive = slots.some((s) => s.equippedSkillId === 'planner')
          return { passiveSlots: slots, isPlannerActive }
        }),

      buySkill: (skillId, cost, coins, spendCoins) => {
        const state = get()
        if (state.ownedSkills.includes(skillId)) return false
        if (coins < cost) return false
        spendCoins(cost)
        set({ ownedSkills: [...state.ownedSkills, skillId] })
        return true
      },

      equipPassive: (skillId, slotIndex) =>
        set((state) => {
          if (!state.ownedSkills.includes(skillId)) return state
          if (slotIndex < 0 || slotIndex >= MAX_PASSIVE_SLOTS) return state
          const slots = [...state.equippedPassive]
          // remove from any other slot first
          const existing = slots.indexOf(skillId)
          if (existing !== -1) slots[existing] = null
          slots[slotIndex] = skillId
          return { equippedPassive: slots }
        }),

      unequipPassive: (slotIndex) =>
        set((state) => {
          const slots = [...state.equippedPassive]
          slots[slotIndex] = null
          return { equippedPassive: slots }
        }),

      equipActive: (skillId) =>
        set((state) => {
          if (!state.ownedSkills.includes(skillId)) return state
          if (state.equippedActive.includes(skillId)) return state
          return {
            equippedActive: [...state.equippedActive, skillId].slice(0, MAX_ACTIVE_EQUIPPED),
          }
        }),

      unequipActive: (skillId) =>
        set((state) => ({
          equippedActive: state.equippedActive.filter((id) => id !== skillId),
        })),

      // legacy helpers kept for backward compatibility
      addOwnedSkill: (skillId) =>
        set((state) => ({
          ownedSkills: state.ownedSkills.includes(skillId)
            ? state.ownedSkills
            : [...state.ownedSkills, skillId],
        })),

      resetSkills: () =>
        set({
          ownedSkills: [],
          equippedPassive: [null, null, null],
          equippedActive: [],
        }),
    }),
    {
      name: 'rc-skill-store',
    },
  ),
)