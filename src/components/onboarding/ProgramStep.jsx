import { useMemo, useState } from 'react'
import StepScreen from '../ui/StepScreen'
import SelectableRow from '../ui/SelectableRow'
import ProgramDetail from './ProgramDetail'
import { useTcasFaculties, useTcasPrograms, useTcasRounds } from '../../hooks/useMytcas'
import { usePlansStore } from '../../stores/usePlansStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { syncSelectToFirestore } from '../../utils/syncSelectToFirestore'

function ProgramRoundBadge({ programId }) {
  const { rounds } = useTcasRounds(programId)
  if (!rounds.length) return null
  return (
    <span className="inline-block rounded-full bg-warn px-2 py-0.5 text-[10px] font-medium text-ink">
      {rounds.map((r) => r.name ?? `รอบ ${r.round}`).join(' · ')}
    </span>
  )
}

function ProgramStep({ onNext, onBack }) {
  const [query, setQuery] = useState('')
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [detailProgram, setDetailProgram] = useState(null)
  const plans = usePlansStore((state) => state.plans)
  const activePlanId = usePlansStore((state) => state.activePlanId)
  const updatePlan = usePlansStore((state) => state.updatePlan)
  const uid = useAuthStore((state) => state.user?.uid)
  const activePlan = plans.find((plan) => plan.id === activePlanId)
  const university = activePlan?.university ?? null
  const selected = activePlan?.program ?? null

  const commitProgram = (programId) => {
    if (!activePlanId) return
    updatePlan(activePlanId, { program: programId })
    if (uid) syncSelectToFirestore(uid)
  }

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

  if (detailProgram) {
    return (
      <ProgramDetail
        programId={detailProgram.program_id}
        programName={detailProgram.program_name_th}
        onBack={() => setDetailProgram(null)}
        onConfirm={() => {
          commitProgram(detailProgram.program_id)
          setDetailProgram(null)
        }}
      />
    )
  }

  const subtitle = selectedFaculty ? (
    <button
      type="button"
      onClick={() => { setSelectedFaculty(null); setQuery('') }}
      className="thai-font text-sm font-semibold text-ink-soft"
    >
      ← เลือกคณะใหม่
    </button>
  ) : (
    <h2 className="thai-font text-sm font-bold text-ink">
      เลือกคณะ
    </h2>
  )

  return (
    <StepScreen
      title="หลักสูตร"
      subtitle={subtitle}
      maxWidth="max-w-3xl"
      searchValue={query}
      onSearchChange={(e) => setQuery(e.target.value)}
      searchLabel="ค้นหาคณะหรือหลักสูตร"
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!selected}
    >
      {!university ? (
        <div className="mt-10 text-center">
          <p className="thai-font text-sm text-ink-soft">
            กรุณาเลือกมหาวิทยาลัยก่อน
          </p>
          <button
            type="button"
            onClick={onBack}
            className="neo-btn mt-3 rounded-xl bg-brand-strong px-4 py-2 thai-font text-sm text-white"
          >
            ไปเลือกมหาวิทยาลัย
          </button>
        </div>
      ) : !selectedFaculty ? (
        facLoading ? (
          <p className="thai-font py-10 text-center text-sm text-ink-soft">
            กำลังโหลดคณะ...
          </p>
        ) : facError ? (
          <p className="thai-font py-10 text-center text-sm text-danger">
            โหลดข้อมูลไม่สำเร็จ
          </p>
        ) : (
          <div className="mx-auto mt-3 max-w-3xl space-y-2">
            {filteredFaculties.map((faculty) => (
              <SelectableRow
                key={faculty.faculty_id}
                title={faculty.faculty_name_th}
                subtitle={`${faculty.program_count} หลักสูตร`}
                onClick={() => { setSelectedFaculty(faculty.faculty_id); setQuery('') }}
              />
            ))}
          </div>
        )
      ) : (
        progLoading ? (
          <p className="thai-font py-10 text-center text-sm text-ink-soft">
            กำลังโหลดหลักสูตร...
          </p>
        ) : progError ? (
          <p className="thai-font py-10 text-center text-sm text-danger">
            โหลดข้อมูลไม่สำเร็จ
          </p>
        ) : (
          <div className="mx-auto mt-3 max-w-3xl space-y-2">
            {filteredPrograms.map((program) => (
              <SelectableRow
                key={program._id}
                title={program.program_name_th}
                subtitle={program.field_name_th || program.program_type_name_th}
                leading={<ProgramRoundBadge programId={program.program_id} />}
                selected={selected === program.program_id}
                onClick={() => setDetailProgram(program)}
              />
            ))}
          </div>
        )
      )}
    </StepScreen>
  )
}

export default ProgramStep
