import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

const { useSkillStore } = await import('./useSkillStore')

const emptySlots = () => [
  { equippedSkillId: null },
  { equippedSkillId: null },
  { equippedSkillId: null },
]

describe('useSkillStore — passive slots', () => {
  beforeEach(() => {
    useSkillStore.setState({
      ownedSkills: [],
      passiveSlots: emptySlots(),
      equippedActive: [],
      isPlannerActive: false,
    })
  })

  it('equips a passive skill into the given slot', () => {
    useSkillStore.getState().equipPassiveSkill('spark', 0)
    expect(useSkillStore.getState().passiveSlots[0].equippedSkillId).toBe('spark')
  })

  it('moves a skill out of its previous slot when re-equipped elsewhere', () => {
    const { equipPassiveSkill } = useSkillStore.getState()
    equipPassiveSkill('spark', 0)
    equipPassiveSkill('spark', 1)
    const slots = useSkillStore.getState().passiveSlots
    expect(slots[0].equippedSkillId).toBeNull()
    expect(slots[1].equippedSkillId).toBe('spark')
  })

  it('tracks isPlannerActive when planner is equipped and cleared', () => {
    const { equipPassiveSkill, clearPassiveSlot } = useSkillStore.getState()
    equipPassiveSkill('planner', 0)
    expect(useSkillStore.getState().isPlannerActive).toBe(true)
    clearPassiveSlot(0)
    expect(useSkillStore.getState().isPlannerActive).toBe(false)
  })
})

describe('useSkillStore — active equip (ownership-gated)', () => {
  beforeEach(() => {
    useSkillStore.setState({ ownedSkills: [], equippedActive: [] })
  })

  it('does not equip an active skill the user does not own', () => {
    useSkillStore.getState().equipActive('capsule')
    expect(useSkillStore.getState().equippedActive).toEqual([])
  })

  it('equips an owned active skill', () => {
    useSkillStore.setState({ ownedSkills: ['capsule'] })
    useSkillStore.getState().equipActive('capsule')
    expect(useSkillStore.getState().equippedActive).toEqual(['capsule'])
  })

  it('does not add the same active skill twice', () => {
    useSkillStore.setState({ ownedSkills: ['capsule'] })
    const { equipActive } = useSkillStore.getState()
    equipActive('capsule')
    equipActive('capsule')
    expect(useSkillStore.getState().equippedActive).toEqual(['capsule'])
  })
})
