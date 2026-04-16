import { useSkillStore } from '../stores/useSkillStore'

function SkillsPage() {
  const ownedSkills = useSkillStore((state) => state.ownedSkills)
  const equippedSkills = useSkillStore((state) => state.equippedSkills)
  const addOwnedSkill = useSkillStore((state) => state.addOwnedSkill)
  const equipSkill = useSkillStore((state) => state.equipSkill)

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Skills</h2>

      <button
        onClick={() => addOwnedSkill('spark')}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Add Spark Skill
      </button>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700">Owned</h3>
        <p className="mt-1 text-sm text-gray-600">{ownedSkills.join(', ') || 'ยังไม่มี skill'}</p>
      </div>

      <button
        onClick={() => equipSkill('spark')}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Equip Spark
      </button>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700">Equipped</h3>
        <p className="mt-1 text-sm text-gray-600">{equippedSkills.join(', ') || 'ยังไม่ได้ใส่ skill'}</p>
      </div>
    </section>
  )
}

export default SkillsPage