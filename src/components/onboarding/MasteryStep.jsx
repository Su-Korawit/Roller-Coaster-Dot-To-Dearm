import { useMemo, useState } from 'react'
import StepScreen from '../ui/StepScreen'
import SelectCard from '../ui/SelectCard'
import { masteries } from '../../data/onboardingData'
import { useSelectStore } from '../../stores/useSelectStore'
import { useSelectionCommit } from '../../hooks/useSelectionCommit'

// Step 3 of OnboardingModal — WizardStepper index 1 ("Mastery").
function MasteryStep({ onNext }) {
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
        <h2 className="pixel-font text-sm font-bold text-gray-700">Recommend</h2>
      }
      searchValue={query}
      onSearchChange={(e) => setQuery(e.target.value)}
      searchLabel="ค้นหาทักษะ"
      onNext={onNext}
      nextDisabled={!selected}
    >
      <div className="mx-auto max-w-4xl mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((mastery) => (
          <SelectCard
            key={mastery.id}
            name={mastery.name}
            detail={mastery.detail}
            selected={selected === mastery.id}
            onClick={() => commitMastery(mastery.id)}
          />
        ))}
      </div>
    </StepScreen>
  )
}

export default MasteryStep
