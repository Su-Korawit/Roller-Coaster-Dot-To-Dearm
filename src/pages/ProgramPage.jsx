import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import WizardStepper from '../components/WizardStepper'
import { useTcasFaculties, useTcasPrograms, useTcasRounds } from '../hooks/useMytcas'
import { useSelectStore } from '../stores/useSelectStore'
import { useAuthStore } from '../stores/useAuthStore'
import { syncSelectToFirestore } from '../utils/syncSelectToFirestore'

// Real admission rounds for a program — fills in lazily, renders nothing until ready.
function ProgramRoundBadge({ programId }) {
  const { rounds } = useTcasRounds(programId)
  if (!rounds.length) return null
  return (
    <p className="pixel-font mt-1.5 inline-block rounded-full bg-yellow-300 px-2.5 py-0.5 text-[10px] text-black">
      {rounds.map((r) => `รอบ ${r.round}`).join(' · ')}
    </p>
  )
}

function ProgramPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedFaculty, setSelectedFaculty] = useState(null) // intermediate UI only
  const university = useSelectStore((state) => state.university)
  const selected = useSelectStore((state) => state.program)
  const setProgram = useSelectStore((state) => state.setProgram)

  const { faculties, loading: facLoading, error: facError } = useTcasFaculties(university)
  const { programs, loading: progLoading, error: progError } = useTcasPrograms(university, selectedFaculty)

  const filteredFaculties = useMemo(() => {
    const q = query.toLowerCase()
    return faculties.filter((f) => f.faculty_name_th.toLowerCase().includes(q))
  }, [faculties, query])

  const filteredPrograms = useMemo(() => {
    const q = query.toLowerCase()
    return programs.filter(
      (p) =>
        p.program_name_th.toLowerCase().includes(q) ||
        (p.field_name_th || '').toLowerCase().includes(q),
    )
  }, [programs, query])

  return (
    <section className="flex h-dvh flex-col bg-linear-to-b from-pink-200 via-pink-100 to-[#efe5ef]">
      <TopBar />

      <div className="shrink-0 px-6 pt-4">
        <h1 className="title-gradient pixel-font text-xl leading-tight">Program</h1>
        <WizardStepper step={3} />
        {selectedFaculty ? (
          <button
            onClick={() => { setSelectedFaculty(null); setQuery('') }}
            className="pixel-font text-sm font-bold text-black/70"
          >
            ← เลือกคณะใหม่
          </button>
        ) : (
          <h2 className="pixel-font text-sm font-bold">เลือกคณะ</h2>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-2">
        {!university ? (
          <div className="mt-10 text-center">
            <p className="pixel-font text-xs text-black/60">กรุณาเลือกมหาวิทยาลัยก่อน</p>
            <button
              onClick={() => navigate('/select/university')}
              className="pixel-font mt-3 rounded-2xl bg-sky-300 px-4 py-2 text-xs text-black"
            >
              ไปเลือกมหาวิทยาลัย
            </button>
          </div>
        ) : !selectedFaculty ? (
          // ── Step A: faculties ──────────────────────────────────────────────
          facLoading ? (
            <p className="pixel-font py-10 text-center text-xs text-black/60">กำลังโหลดคณะ...</p>
          ) : facError ? (
            <p className="pixel-font py-10 text-center text-xs text-red-500">โหลดข้อมูลไม่สำเร็จ</p>
          ) : (
            <div className="mt-3 space-y-3">
              {filteredFaculties.map((faculty) => (
                <button
                  key={faculty.faculty_id}
                  onClick={() => { setSelectedFaculty(faculty.faculty_id); setQuery('') }}
                  className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left"
                >
                  <span className="pixel-font text-sm font-bold text-black">{faculty.faculty_name_th}</span>
                  <span className="pixel-font shrink-0 text-[10px] text-black/50">{faculty.program_count} หลักสูตร</span>
                </button>
              ))}
            </div>
          )
        ) : (
          // ── Step B: programs ───────────────────────────────────────────────
          progLoading ? (
            <p className="pixel-font py-10 text-center text-xs text-black/60">กำลังโหลดหลักสูตร...</p>
          ) : progError ? (
            <p className="pixel-font py-10 text-center text-xs text-red-500">โหลดข้อมูลไม่สำเร็จ</p>
          ) : (
            <div className="mt-3 space-y-4">
              {filteredPrograms.map((program) => (
                <button
                  key={program._id}
                  onClick={() => {
                    setProgram(program.program_id)
                    syncSelectToFirestore(useAuthStore.getState().user?.uid)
                  }}
                  className={`w-full rounded-2xl bg-white px-4 py-3 text-left ${
                    selected === program.program_id ? 'ring-4 ring-pink-400' : ''
                  }`}
                >
                  <p className="pixel-font text-sm font-bold text-black">{program.program_name_th}</p>
                  {program.field_name_th && (
                    <p className="pixel-font mt-0.5 text-[10px] leading-tight text-black/70">{program.field_name_th}</p>
                  )}
                  <p className="pixel-font mt-0.5 text-[10px] text-black/50">{program.program_type_name_th}</p>
                  <ProgramRoundBadge programId={program.program_id} />
                </button>
              ))}
            </div>
          )
        )}
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
