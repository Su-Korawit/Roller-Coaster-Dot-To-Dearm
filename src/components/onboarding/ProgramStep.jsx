import { useMemo, useState } from 'react'
import StepScreen from '../ui/StepScreen'
import { useTcasFaculties, useTcasPrograms, useTcasRounds } from '../../hooks/useMytcas'
import { useSelectStore } from '../../stores/useSelectStore'
import { useSelectionCommit } from '../../hooks/useSelectionCommit'

function ProgramRoundBadge({ programId }) {
  const { rounds } = useTcasRounds(programId)
  if (!rounds.length) return null
  return (
    <span
      className="mt-1.5 inline-block rounded-full bg-yellow-300 px-2.5 py-0.5 text-xs text-black font-medium"
      style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
    >
      {rounds.map((r) => `รอบ ${r.round}`).join(' · ')}
    </span>
  )
}

// Step 5 (final) of OnboardingModal — WizardStepper index 3 ("Program").
// Selecting a program commits it immediately (see commitProgram below);
// pressing the sticky "Next" button (onNext) finishes onboarding — the
// additive profile.programs[] write already happens via useSelectionCommit
// → syncSelectToFirestore, same as the singular profile.program field.
function ProgramStep({ onNext, onBack }) {
  const [query, setQuery] = useState('')
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const university = useSelectStore((state) => state.university)
  const selected = useSelectStore((state) => state.program)
  const setProgram = useSelectStore((state) => state.setProgram)
  const commitProgram = useSelectionCommit(setProgram)

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

  const subtitle = selectedFaculty ? (
    <button
      onClick={() => { setSelectedFaculty(null); setQuery('') }}
      className="text-sm font-semibold text-gray-600 focus-visible:outline-none focus-visible:underline"
      style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
    >
      ← เลือกคณะใหม่
    </button>
  ) : (
    <h2
      className="text-sm font-bold text-gray-700"
      style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
    >
      เลือกคณะ
    </h2>
  )

  return (
    <StepScreen
      step={3}
      title="Program"
      subtitle={subtitle}
      maxWidth="max-w-3xl"
      searchValue={query}
      onSearchChange={(e) => setQuery(e.target.value)}
      searchLabel="ค้นหาคณะหรือหลักสูตร"
      onNext={onNext}
      nextDisabled={!selected}
    >
      {!university ? (
        <div className="mt-10 text-center">
          <p
            className="text-sm text-gray-500"
            style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
          >
            กรุณาเลือกมหาวิทยาลัยก่อน
          </p>
          <button
            onClick={onBack}
            className="mt-3 rounded-2xl bg-brand px-4 py-2 text-sm text-white"
            style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
          >
            ไปเลือกมหาวิทยาลัย
          </button>
        </div>
      ) : !selectedFaculty ? (
        facLoading ? (
          <p
            className="py-10 text-center text-sm text-gray-500"
            style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
          >
            กำลังโหลดคณะ...
          </p>
        ) : facError ? (
          <p className="py-10 text-center text-sm text-red-500" style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
            โหลดข้อมูลไม่สำเร็จ
          </p>
        ) : (
          <div className="mx-auto max-w-3xl mt-3 space-y-3">
            {filteredFaculties.map((faculty) => (
              <button
                key={faculty.faculty_id}
                onClick={() => { setSelectedFaculty(faculty.faculty_id); setQuery('') }}
                className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-sm
                  hover:shadow-md active:scale-[0.98] transition-all
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
              >
                <span
                  className="text-sm font-bold text-gray-900"
                  style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
                >
                  {faculty.faculty_name_th}
                </span>
                <span
                  className="shrink-0 text-xs text-gray-400 ml-3"
                  style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
                >
                  {faculty.program_count} หลักสูตร
                </span>
              </button>
            ))}
          </div>
        )
      ) : (
        progLoading ? (
          <p
            className="py-10 text-center text-sm text-gray-500"
            style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
          >
            กำลังโหลดหลักสูตร...
          </p>
        ) : progError ? (
          <p className="py-10 text-center text-sm text-red-500" style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
            โหลดข้อมูลไม่สำเร็จ
          </p>
        ) : (
          <div className="mx-auto max-w-3xl mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPrograms.map((program) => (
              <button
                key={program._id}
                onClick={() => commitProgram(program.program_id)}
                aria-pressed={selected === program.program_id}
                className={`w-full rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition-all
                  hover:shadow-md active:scale-[0.98]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
                  ${selected === program.program_id ? 'ring-4 ring-pink-400 shadow-md' : ''}`}
              >
                <p
                  className="text-sm font-bold text-gray-900"
                  style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
                >
                  {program.program_name_th}
                </p>
                {program.field_name_th && (
                  <p
                    className="mt-0.5 text-xs leading-tight text-gray-500"
                    style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
                  >
                    {program.field_name_th}
                  </p>
                )}
                <p
                  className="mt-0.5 text-xs text-gray-400"
                  style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
                >
                  {program.program_type_name_th}
                </p>
                <ProgramRoundBadge programId={program.program_id} />
              </button>
            ))}
          </div>
        )
      )}
    </StepScreen>
  )
}

export default ProgramStep
