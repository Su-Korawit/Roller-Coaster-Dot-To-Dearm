import { useMemo, useState } from 'react'
import StepScreen from '../ui/StepScreen'
import SelectCard from '../ui/SelectCard'
import { careers } from '../../data/onboardingData'
import { useSelectStore } from '../../stores/useSelectStore'
import { useSelectionCommit } from '../../hooks/useSelectionCommit'

// Step 2 of OnboardingModal — WizardStepper index 0 ("Career").
function CareerStep({ onNext }) {
  const [query, setQuery] = useState('')
  const mbti = useSelectStore((state) => state.mbti)
  const selected = useSelectStore((state) => state.career)
  const setCareer = useSelectStore((state) => state.setCareer)
  const commitCareer = useSelectionCommit(setCareer)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const base = q ? careers : careers.filter((item) => !mbti || item.mbti.includes(mbti))
    return base.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q) ||
        (item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false),
    )
  }, [mbti, query])

  return (
    <StepScreen
      step={0}
      title="Career"
      subtitle={
        <h2 className="pixel-font text-sm font-bold text-gray-700">Recommend</h2>
      }
      searchValue={query}
      onSearchChange={(e) => setQuery(e.target.value)}
      searchLabel="ค้นหาอาชีพ"
      onNext={onNext}
      nextDisabled={!selected}
      attribution="Occupation data: O*NET Web Services · U.S. DOL/ETA · CC BY 4.0"
    >
      <div className="mx-auto max-w-4xl mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((career) => (
          <SelectCard
            key={career.id}
            name={career.name}
            detail={career.detail}
            selected={selected === career.id}
            onClick={() => commitCareer(career.id)}
          />
        ))}
      </div>
    </StepScreen>
  )
}

export default CareerStep
