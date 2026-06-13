import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepScreen from '../components/ui/StepScreen'
import SelectCard from '../components/ui/SelectCard'
import { careers } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'
import { useAuthStore } from '../stores/useAuthStore'
import { syncSelectToFirestore } from '../utils/syncSelectToFirestore'

function CareerPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const mbti = useSelectStore((state) => state.mbti)
  const selected = useSelectStore((state) => state.career)
  const setCareer = useSelectStore((state) => state.setCareer)

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
      onNext={() => navigate('/select/mastery')}
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
            onClick={() => {
              setCareer(career.id)
              syncSelectToFirestore(useAuthStore.getState().user?.uid)
            }}
          />
        ))}
      </div>
    </StepScreen>
  )
}

export default CareerPage
