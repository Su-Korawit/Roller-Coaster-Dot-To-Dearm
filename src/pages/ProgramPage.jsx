import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import WizardStepper from '../components/WizardStepper'
import { programs, universities } from '../data/onboardingData'
import { useSelectStore } from '../stores/useSelectStore'

function ProgramPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const selectedUniv = useSelectStore((state) => state.university)
  const selected = useSelectStore((state) => state.program)
  const setProgram = useSelectStore((state) => state.setProgram)

  const uniMap = useMemo(() => Object.fromEntries(universities.map((item) => [item.id, item])), [])

  const filtered = useMemo(
    () =>
      programs
        .filter((item) => !selectedUniv || item.uni === selectedUniv)
        .filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [selectedUniv, query],
  )

  return (
    <section className="h-full overflow-hidden bg-linear-to-b from-pink-200 via-pink-100 to-[#efe5ef]">
      <TopBar />
      <div className="h-[calc(100%-138px)] overflow-y-auto px-6 pb-6">
        <h1 className="title-gradient pixel-font text-xl leading-tight">Program</h1>
        <WizardStepper step={3} />

        <h2 className="pixel-font text-sm font-bold">Recommend</h2>
        <div className="mt-3 space-y-4">
          {filtered.map((program) => (
            <button
              key={program.id}
              onClick={() => setProgram(program.id)}
              className={`w-full rounded-2xl bg-white px-4 py-3 text-left ${
                selected === program.id ? 'ring-4 ring-pink-400' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={uniMap[program.uni]?.image}
                  alt={program.name}
                  className="h-12 w-12 shrink-0 rounded-full bg-gray-100 object-contain p-1"
                />
                <div>
                  <p className="pixel-font text-sm font-bold text-black">{program.name}</p>
                  <p className="pixel-font mt-0.5 text-[10px] leading-tight text-black/70">{program.detail}</p>
                  <p className="pixel-font mt-1.5 inline-block rounded-full bg-yellow-300 px-2.5 py-0.5 text-[10px] text-black">
                    {program.round}
                  </p>
                </div>
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
          onClick={() => navigate('/home')}
          disabled={!selected}
          className="pixel-font mt-4 h-11 w-full rounded-2xl bg-sky-300 text-sm text-black disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  )
}

export default ProgramPage
