import { useMemo, useState } from 'react'
import StepScreen from '../ui/StepScreen'
import SelectableRow from '../ui/SelectableRow'
import { masteries } from '../../data/onboardingData'
import { useSelectStore } from '../../stores/useSelectStore'
import { useSelectionCommit } from '../../hooks/useSelectionCommit'

// Step 3 — searchable radio-row mastery list.
function MasteryStep({ onNext, onBack }) {
  const [query, setQuery] = useState('')
  const career = useSelectStore((state) => state.career)
  const selected = useSelectStore((state) => state.mastery)
  const setMastery = useSelectStore((state) => state.setMastery)
  const commitMastery = useSelectionCommit(setMastery)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const base = q ? masteries : masteries.filter((item) => !career || item.careers.includes(career))
    return base.filter((item) => item.name.toLowerCase().includes(q))
  }, [career, query])

  return (
    <StepScreen
      step={1}
      title="Mastery"
      subtitle={
        <h2 className="pixel-font text-sm font-bold text-gray-700">ทักษะที่ต้องพัฒนา</h2>
      }
      searchValue={query}
      onSearchChange={(e) => setQuery(e.target.value)}
      searchLabel="ค้นหาทักษะ"
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!selected}
      progress={{ value: 3, total: 5 }}
    >
      <div className="mx-auto mt-3 max-w-3xl space-y-2">
        {filtered.map((mastery) => (
          <SelectableRow
            key={mastery.id}
            title={mastery.name}
            subtitle={mastery.detail}
            selected={selected === mastery.id}
            onClick={() => commitMastery(mastery.id)}
          />
        ))}
      </div>
    </StepScreen>
  )
}

export default MasteryStep
