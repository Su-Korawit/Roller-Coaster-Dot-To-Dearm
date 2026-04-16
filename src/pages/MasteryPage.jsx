import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import WizardStepper from '../components/WizardStepper'
import { masteries } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'

function MasteryPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const career = useSelectStore((state) => state.career)
  const selected = useSelectStore((state) => state.mastery)
  const setMastery = useSelectStore((state) => state.setMastery)

  const filtered = useMemo(
    () =>
      masteries
        .filter((item) => !career || item.careers.includes(career))
        .filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [career, query],
  )

  return (
    <section className="h-full overflow-hidden bg-linear-to-b from-pink-200 via-pink-100 to-cyan-300">
      <TopBar />
      <div className="h-[calc(100%-138px)] overflow-y-auto px-6 pb-6">
        <h1 className="title-gradient pixel-font text-xl leading-tight">Mastery</h1>
        <WizardStepper step={1} />

        <h2 className="pixel-font text-sm font-bold">Recommend</h2>
        <div className="mt-3 space-y-4">
          {filtered.map((mastery) => (
            <button
              key={mastery.id}
              onClick={() => setMastery(mastery.id)}
              className={`flex w-full items-center overflow-hidden rounded-2xl bg-white text-left ${
                selected === mastery.id ? 'ring-4 ring-pink-400' : ''
              }`}
            >
              <img src={mastery.image} alt={mastery.name} className="h-20 w-20 shrink-0 object-cover" />
              <div className="px-3 py-2">
                <p className="pixel-font text-sm font-bold text-black">{mastery.name}</p>
                <p className="pixel-font mt-1 text-[10px] leading-tight text-black/70">{mastery.detail}</p>
              </div>
            </button>
          ))}
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
          onClick={() => navigate('/select/university')}
          disabled={!selected}
          className="pixel-font mt-4 h-11 w-full rounded-2xl bg-sky-300 text-sm text-black disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  )
}

export default MasteryPage
