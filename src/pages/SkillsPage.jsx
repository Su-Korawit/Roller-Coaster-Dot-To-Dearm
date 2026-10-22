import { useSkillStore } from '../stores/useSkillStore'

function SkillsPage() {
  const ownedSkills = useSkillStore((state) => state.ownedSkills)
  const equippedSkills = useSkillStore((state) => state.equippedSkills)
  const addOwnedSkill = useSkillStore((state) => state.addOwnedSkill)
  const equipSkill = useSkillStore((state) => state.equipSkill)

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-ink">Skills</h2>

      <button
        onClick={() => addOwnedSkill('spark')}
        className="px-btn rounded-lg bg-brand-strong px-4 py-2 text-sm font-semibold text-white"
      >
        Add Spark Skill
      </button>

      <div className="px-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-ink">Owned</h3>
        <p className="mt-1 text-sm text-ink-soft thai-font">{ownedSkills.join(', ') || 'ยังไม่มี skill'}</p>
      </div>

      <button
        onClick={() => equipSkill('spark')}
        className="px-btn rounded-lg bg-good px-4 py-2 text-sm font-semibold text-ink"
      >
        Equip Spark
      </button>

      <div className="px-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-ink">Equipped</h3>
        <p className="mt-1 text-sm text-ink-soft thai-font">{equippedSkills.join(', ') || 'ยังไม่ได้ใส่ skill'}</p>
      </div>
    </section>
  )
}

export default SkillsPage
