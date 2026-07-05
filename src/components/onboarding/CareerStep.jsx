import { useMemo, useState } from 'react'
import StepScreen from '../ui/StepScreen'
import SelectableRow from '../ui/SelectableRow'
import { careers } from '../../data/onboardingData'
import { useSelectStore } from '../../stores/useSelectStore'
import { useSelectionCommit } from '../../hooks/useSelectionCommit'

// Step 2 — searchable radio-row career list.
function CareerStep({ onNext, onBack }) {
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
      title="อาชีพ"
      subtitle={
        <h2 className="pixel-font text-sm font-bold text-gray-700">แนะนำตาม MBTI</h2>
      }
      searchValue={query}
      onSearchChange={(e) => setQuery(e.target.value)}
      searchLabel="ค้นหาอาชีพ"
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!selected}
      progress={{ value: 2, total: 5 }}
      attribution="Occupation data: O*NET Web Services · U.S. DOL/ETA · CC BY 4.0"
    >
      <div className="mx-auto mt-3 max-w-3xl space-y-2">
        {filtered.map((career) => (
          <SelectableRow
            key={career.id}
            title={career.name}
            subtitle={career.detail}
            selected={selected === career.id}
            onClick={() => commitCareer(career.id)}
          />
        ))}
      </div>
    </StepScreen>
  )
}

export default CareerStep
