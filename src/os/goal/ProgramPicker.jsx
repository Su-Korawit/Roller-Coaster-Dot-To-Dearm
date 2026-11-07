import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { useTcasUniversities, useTcasFaculties, useTcasPrograms, useTcasRounds } from '../../hooks/useMytcas'
import { scoresFromProject, matchUniversity } from '../goalLogic'
import { BackBar, SearchBox, PickRow, UniLogo, Loading, Failed } from './ui'

const has = (text, q) => String(text ?? '').toLowerCase().includes(q.trim().toLowerCase())

// "ยังไม่เจอ" card: MyTCAS is the main source; TCAS Starter (Dek-D) is offered when nothing matches.
function NotFound({ what, query, onStarter }) {
  return (
    <div className="px-card p-4 flex flex-col gap-2 bg-brand-soft text-center">
      <p className="thai-font text-sm font-semibold">ไม่พบ{what}{query ? ` "${query}"` : ''}ใน MyTCAS</p>
      <p className="thai-font text-xs text-ink-soft">ลองหาจากเว็บ TCAS Starter ของ Dek-D แทนได้ (ไม่ใช่ข้อมูลทางการ)</p>
      <button type="button" onClick={onStarter} className="self-center px-btn px-4 py-1.5 thai-font text-xs font-bold bg-paper">ค้นหาใน TCAS Starter</button>
    </div>
  )
}

function Detail({ program, uni, faculty, onBack, onPick }) {
  const { rounds, announced, tcasYear, loading, error, refetch } = useTcasRounds(program.program_id)
  const round3 = rounds.find((r) => r.round === 3)
  const projects = (round3?.projects ?? []).filter((p) => p.scores?.length)
  const [pi, setPi] = useState(0)
  const project = projects[pi] ?? null
  const reqs = scoresFromProject(project)

  return (
    <div className="flex flex-col gap-4">
      <BackBar onBack={onBack} title={program.program_name_th} sub={`${uni.university_name_th} · ${faculty.faculty_name_th}`} />
      {loading ? <Loading text="กำลังโหลดเกณฑ์รอบ 3..." /> : error ? <Failed onRetry={refetch} /> : (
        <>
          {!round3 || projects.length === 0 ? (
            <p className="thai-font text-sm text-ink-soft px-card p-3">
              {announced === false && tcasYear ? `เกณฑ์ TCAS${tcasYear - 2500} ยังไม่ประกาศ` : 'ไม่พบเกณฑ์รอบ 3 ของหลักสูตรนี้'} เลือกเป็นเป้าหมายได้เลย แล้วเพิ่มวิชาที่ต้องใช้เองทีหลัง
            </p>
          ) : (
            <section className="px-card p-4 flex flex-col gap-3" aria-label="เกณฑ์รอบ 3">
              <h4 className="thai-font font-bold text-sm">รอบ 3 Admission{tcasYear ? ` TCAS${tcasYear - 2500}` : ''}</h4>
              {projects.length > 1 && (
                <select value={pi} onChange={(e) => setPi(Number(e.target.value))} aria-label="เลือกโครงการ" className="px-input h-10 px-2 thai-font text-sm">
                  {projects.map((p, i) => <option key={p.project_id ?? i} value={i}>{p.project_name_th ?? `โครงการ ${i + 1}`}</option>)}
                </select>
              )}
              <p className="thai-font text-xs text-ink-soft">
                {[project.seats ? `รับ ${project.seats} คน` : '', project.min_gpax ? `GPAX ขั้นต่ำ ${project.min_gpax}` : '', project.min_total_score ? `คะแนนรวมขั้นต่ำ ${project.min_total_score}` : ''].filter(Boolean).join(' · ') || 'ยังไม่มีข้อมูลคะแนนขั้นต่ำ'}
              </p>
              <ul className="flex flex-col gap-1.5">
                {reqs.map((r) => (
                  <li key={r.subject} className="flex items-center gap-2 thai-font text-sm">
                    <span className="flex-1 min-w-0 truncate">{r.subject}</span>
                    <span className="w-24 h-2 rounded-full bg-mist overflow-hidden"><span className="block h-full bg-brand" style={{ width: `${Math.min(100, r.weight)}%` }} /></span>
                    <span className="w-10 text-right text-xs text-ink-soft">{r.weight}%</span>
                  </li>
                ))}
              </ul>
              {reqs.some((r) => r.estimated) && <p className="thai-font text-xs text-ink-soft">เกณฑ์ไม่ได้ระบุคะแนนขั้นต่ำ ระบบตั้งเป้าเริ่มต้นไว้ที่ 60 แก้ได้ในหน้าเป้าหมาย</p>}
            </section>
          )}
          <button
            type="button"
            onClick={() => onPick({
              source: 'mytcas', universityId: uni.university_id, university: uni.university_name_th,
              faculty: faculty.faculty_name_th, program: program.program_name_th, programId: program.program_id, reqs,
            })}
            className="px-btn py-2.5 thai-font text-sm font-bold bg-brand-strong text-white flex items-center justify-center gap-2"
          >
            <Check size={16} aria-hidden="true" /> ตั้งเป็นเป้าหมาย
          </button>
        </>
      )}
    </div>
  )
}

// Pick university → faculty → programme from MyTCAS (official). `initial` jumps straight to a
// university (and pre-fills the faculty search), used by the advisor and the university apps.
export default function ProgramPicker({ onPick, onStarter, onCancel, initial = null, lockUniversityId = null }) {
  const unis = useTcasUniversities()
  const [uni, setUni] = useState(null)
  const [fac, setFac] = useState(null)
  const [program, setProgram] = useState(null)
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState(false)

  // One-shot jump from `initial` / `lockUniversityId` once the university list has arrived.
  useEffect(() => {
    if (applied || unis.universities.length === 0) return
    const found = lockUniversityId
      ? unis.universities.find((u) => u.university_id === lockUniversityId)
      : initial?.university ? matchUniversity(unis.universities, initial.university) : null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApplied(true)
    if (found) { setUni(found); setQuery(initial?.faculty ?? '') }
  }, [applied, unis.universities, initial, lockUniversityId])

  const facs = useTcasFaculties(uni?.university_id)
  const progs = useTcasPrograms(uni?.university_id, fac?.faculty_id)

  const shownUnis = useMemo(() => unis.universities.filter((u) => has(u.university_name_th, query) || has(u.university_name_en, query)), [unis.universities, query])
  const shownFacs = useMemo(() => facs.faculties.filter((f) => has(f.faculty_name_th, query)), [facs.faculties, query])
  const shownProgs = useMemo(() => progs.programs.filter((p) => has(p.program_name_th, query) || has(p.field_name_th, query)), [progs.programs, query])

  const starter = (extra = {}) => onStarter?.({ university: uni?.university_name_th ?? '', query, ...extra })
  const go = (setter, value) => { setter(value); setQuery('') }

  if (uni && fac && program) {
    return <Detail program={program} uni={uni} faculty={fac} onBack={() => setProgram(null)} onPick={onPick} />
  }

  if (uni && fac) {
    return (
      <div className="flex flex-col gap-3">
        <BackBar onBack={() => go(setFac, null)} title={fac.faculty_name_th} sub={uni.university_name_th} />
        <SearchBox value={query} onChange={setQuery} label="ค้นหาหลักสูตร / สาขา" />
        {progs.loading ? <Loading /> : progs.error ? <Failed onRetry={progs.refetch} /> : (
          <>
            {shownProgs.map((p) => <PickRow key={p.program_id} title={p.program_name_th} sub={p.field_name_th || p.program_type_name_th} onClick={() => setProgram(p)} />)}
            {shownProgs.length === 0 && <NotFound what="หลักสูตร" query={query} onStarter={() => starter({ level: 'prog', faculty: fac.faculty_name_th })} />}
          </>
        )}
      </div>
    )
  }

  if (uni) {
    return (
      <div className="flex flex-col gap-3">
        <BackBar onBack={lockUniversityId ? onCancel : () => go(setUni, null)} title={uni.university_name_th} sub={`เลือกคณะ · ${uni.faculty_count ?? ''} คณะ`} />
        <SearchBox value={query} onChange={setQuery} label="ค้นหาคณะ" />
        {facs.loading ? <Loading /> : facs.error ? <Failed onRetry={facs.refetch} /> : (
          <>
            {shownFacs.map((f) => <PickRow key={f.faculty_id} title={f.faculty_name_th} sub={`${f.program_count} หลักสูตร`} onClick={() => go(setFac, f)} />)}
            {shownFacs.length === 0 && <NotFound what="คณะ" query={query} onStarter={() => starter({ level: 'fac' })} />}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <BackBar onBack={onCancel} title="เลือกมหาวิทยาลัย" sub="ข้อมูลจาก MyTCAS" />
      <SearchBox value={query} onChange={setQuery} label="ค้นหามหาวิทยาลัย" />
      {unis.loading ? <Loading /> : unis.error ? <Failed onRetry={unis.refetch} /> : (
        <>
          {shownUnis.map((u) => (
            <PickRow key={u.university_id} title={u.university_name_th} sub={`${u.faculty_count} คณะ · ${u.program_count} หลักสูตร`} leading={<UniLogo id={u.university_id} name={u.university_name_th} />} onClick={() => go(setUni, u)} />
          ))}
          {shownUnis.length === 0 && <NotFound what="มหาวิทยาลัย" query={query} onStarter={() => starter({ level: 'uni', university: '' })} />}
        </>
      )}
    </div>
  )
}
