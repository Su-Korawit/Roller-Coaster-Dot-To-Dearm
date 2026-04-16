import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import WizardStepper from '../components/WizardStepper'
import { universities } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'

function UniversityPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const selected = useSelectStore((state) => state.university)
  const setUniversity = useSelectStore((state) => state.setUniversity)

  const filtered = useMemo(
    () => universities.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  return (
    <section className="h-full overflow-hidden bg-linear-to-b from-pink-200 via-pink-100 to-emerald-300">
      <TopBar />
      <div className="h-[calc(100%-138px)] overflow-y-auto px-6 pb-6">
        <h1 className="title-gradient pixel-font text-xl leading-tight">University</h1>
        <WizardStepper step={2} />

        <div className="rounded-[20px] bg-white/55 p-4">
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((university) => (
              <button
                key={university.id}
                onClick={() => setUniversity(university.id)}
                className={`rounded-2xl bg-white p-3 ${selected === university.id ? 'ring-4 ring-pink-400' : ''}`}
                title={university.name}
              >
                <img src={university.image} alt={university.name} className="mx-auto h-20 w-20 object-contain" />
              </button>
            ))}
          </div>
        </div>

        <p className="pixel-font mt-4 text-center text-[10px] text-black/60">↓ Scroll down or Search</p>
        <div className="mt-3 flex items-center rounded-2xl bg-white px-4 py-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            className="pixel-font w-full bg-transparent text-sm outline-none"
          />
          <span className="text-lg">⌕</span>
        </div>

        <button
          onClick={() => navigate('/select/program')}
          disabled={!selected}
          className="pixel-font mt-4 h-11 w-full rounded-2xl bg-sky-300 text-sm text-black disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  )
}

export default UniversityPage
