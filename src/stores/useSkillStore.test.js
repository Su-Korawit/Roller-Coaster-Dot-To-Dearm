import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
})

const { useSkillStore } = await import('./useSkillStore')
const { useUserStore } = await import('./useUserStore')

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

describe('useSkillStore — buySkill (owns coin spend, no callback inversion)', () => {
  beforeEach(() => {
    useSkillStore.setState({ ownedSkills: [] })
    useUserStore.setState({ coins: 100 })
  })

  it('deducts coins and grants the skill when affordable', () => {
    const ok = useSkillStore.getState().buySkill('spark', 30)
    expect(ok).toBe(true)
    expect(useUserStore.getState().coins).toBe(70)
    expect(useSkillStore.getState().ownedSkills).toContain('spark')
  })

  it('refuses when coins are insufficient — no deduction, not owned', () => {
    useUserStore.setState({ coins: 10 })
    const ok = useSkillStore.getState().buySkill('spark', 30)
    expect(ok).toBe(false)
    expect(useUserStore.getState().coins).toBe(10)
    expect(useSkillStore.getState().ownedSkills).not.toContain('spark')
  })

  it('refuses to re-buy an owned skill — no deduction', () => {
    useSkillStore.setState({ ownedSkills: ['spark'] })
    const ok = useSkillStore.getState().buySkill('spark', 30)
    expect(ok).toBe(false)
    expect(useUserStore.getState().coins).toBe(100)
  })
})
