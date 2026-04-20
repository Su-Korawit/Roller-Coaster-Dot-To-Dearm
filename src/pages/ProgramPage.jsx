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
        .filter((item) => {
          const q = query.toLowerCase()
          return item.name.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q)
        }),
    [selectedUniv, query],
  )

  return (
    <section className="flex h-full flex-col bg-linear-to-b from-pink-200 via-pink-100 to-[#efe5ef]">
      <TopBar />

      <div className="shrink-0 px-6 pt-4">
        <h1 className="title-gradient pixel-font text-xl leading-tight">Program</h1>
        <WizardStepper step={3} />
        <h2 className="pixel-font text-sm font-bold">Recommend</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-2">
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
                {uniMap[program.uni]?.image ? (
                  <img
                    src={uniMap[program.uni].image}
                    alt={program.name}
                    className="h-12 w-12 shrink-0 rounded-full bg-gray-100 object-contain p-1"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-400 to-purple-500">
                    <span className="pixel-font text-[8px] font-bold text-white">{uniMap[program.uni]?.shortName}</span>
                  </div>
                )}
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
      </div>

      <div className="shrink-0 border-t border-white/50 bg-white/40 px-6 py-4 backdrop-blur-md">
        <p className="pixel-font mb-2 text-center text-[10px] text-black/60">↓ Scroll down or Search</p>
        <div className="flex items-center rounded-2xl bg-white px-4 py-3">
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
          className="pixel-font mt-3 h-11 w-full rounded-2xl bg-sky-300 text-sm text-black disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  )
}

export default ProgramPage
