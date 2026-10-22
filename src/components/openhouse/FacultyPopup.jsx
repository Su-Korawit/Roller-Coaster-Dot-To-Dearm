import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { BUILDING_BY_ID, ZONES } from '../../constants/openHouseBuildings'
import { filterUniversities, summariseBuilding, summariseRounds, universityTypes } from '../../utils/openHouseIndex'
import { useOpenHouseStore } from '../../stores/useOpenHouseStore'
import { usePlanUiStore } from '../../stores/usePlanUiStore'
import { Z_PANEL } from '../../constants/zIndex'
import { ROUNDS } from '../../constants/tcasRounds'
import RoundTabs from './RoundTabs'
import FilterBar from './FilterBar'
import UniversityRow from './UniversityRow'

const PAGE = 40 // rows drawn at a time: a 600-university building stays responsive

const firstAnnounced = (summary) => ROUNDS.find((r) => summary[r].universities > 0) ?? 1

const thaiDate = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Message({ children, action }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="thai-font text-sm text-ink">{children}</p>
      {action}
    </div>
  )
}

// The faculty popup (mockup: openhouse-popup.html). Right-hand panel on desktop, 84 % bottom
// sheet on a phone. Mount it with `key={buildingId}` so every building starts from clean filters.
export default function FacultyPopup({ buildingId, onClose }) {
  const building = BUILDING_BY_ID[buildingId]
  const entry = useOpenHouseStore((s) => s.buildings[buildingId])
  const loadBuilding = useOpenHouseStore((s) => s.loadBuilding)
  const retry = useOpenHouseStore((s) => s.retry)

  const [round, setRound] = useState(null)
  const [query, setQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [sort, setSort] = useState('seats')
  const [expandedId, setExpandedId] = useState(null)
  const [shown, setShown] = useState(PAGE)

  useEffect(() => { loadBuilding(buildingId) }, [buildingId, loadBuilding])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const universities = useMemo(() => (entry?.status === 'ready' ? entry.data.universities : []), [entry])
  const summary = useMemo(() => summariseRounds(universities), [universities])
  const totals = useMemo(() => summariseBuilding(universities), [universities])
  const types = useMemo(() => universityTypes(universities), [universities])
  const activeRound = round ?? firstAnnounced(summary)
  const rows = useMemo(
    () => filterUniversities(universities, { query, types: selectedTypes, round: activeRound, sort }),
    [universities, query, selectedTypes, activeRound, sort],
  )

  if (!building) return null
  const zone = ZONES[building.zone]
  const reset = (fn) => (...args) => { fn(...args); setShown(PAGE); setExpandedId(null) }

  const addToPlan = (university, program) => {
    usePlanUiStore.getState().openAdd({
      universityId: university.id,
      universityName: university.nameTh,
      programId: program.programId,
      programName: program.nameTh,
      buildingId,
      rounds: (program.rounds ?? []).map((r) => ({ round: r.round, projects: r.projects ?? [] })),
    })
  }

  const filtered = query !== '' || selectedTypes.length > 0
  const updated = entry?.status === 'ready' && entry.data.updatedAt ? thaiDate(entry.data.updatedAt) : null

  let body
  if (!entry || entry.status === 'loading') {
    body = <Message>กำลังโหลดข้อมูล…</Message>
  } else if (entry.status === 'error') {
    body = entry.error === 'missing'
      ? <Message>ข้อมูลตึกนี้กำลังอัปเดต ลองกลับมาใหม่ภายหลัง</Message>
      : (
        <Message action={<button type="button" onClick={() => retry(buildingId)} className="px-btn h-10 px-4 text-sm font-bold bg-leaf text-ink">ลองใหม่</button>}>
          โหลดข้อมูลไม่สำเร็จ
        </Message>
      )
  } else if (summary[activeRound].universities === 0) {
    body = <Message>{`รอบ ${activeRound} ยังไม่ประกาศ`}</Message>
  } else if (rows.length === 0) {
    body = (
      <Message action={<button type="button" onClick={reset(() => { setQuery(''); setSelectedTypes([]) })} className="px-btn h-10 px-4 text-sm font-bold bg-paper text-ink">ล้างตัวกรอง</button>}>
        {filtered ? 'ไม่พบมหาลัยหรือหลักสูตรที่ค้นหา' : 'ไม่มีรายการ'}
      </Message>
    )
  } else {
    body = (
      <ul className="flex-1 min-h-0 overflow-y-auto bg-paper" aria-label="มหาวิทยาลัย">
        {rows.slice(0, shown).map((u) => (
          <UniversityRow
            key={u.id}
            university={u}
            round={activeRound}
            zone={zone}
            expanded={expandedId === u.id}
            onToggle={() => setExpandedId((cur) => (cur === u.id ? null : u.id))}
            onAdd={addToPlan}
          />
        ))}
        {rows.length > shown && (
          <li className="p-3">
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="px-btn h-10 w-full text-sm font-bold bg-paper text-ink">
              {`แสดงเพิ่ม (อีก ${rows.length - shown})`}
            </button>
          </li>
        )}
      </ul>
    )
  }

  return (
    <div className="absolute inset-0 flex md:justify-end items-end md:items-stretch" style={{ zIndex: Z_PANEL }}>
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-label={building.nameTh}
        className="relative flex flex-col overflow-hidden w-full h-[84%] md:h-auto md:w-[420px] md:m-4 bg-paper border-2 border-line rounded-t-sheet md:rounded-slot"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <header className="flex items-start gap-3 px-4 pt-3 pb-2.5 border-b-2 border-line shrink-0" style={{ background: zone.soft }}>
          <div className="min-w-0 flex-1">
            <h2 className="pixel-font text-lg leading-tight text-ink">{building.nameTh}</h2>
            <p className="thai-font text-xs text-ink-soft mt-0.5">
              {entry?.status === 'ready' ? `${totals.universities} มหาลัย · ${totals.programs} หลักสูตร · ` : ''}{`โซน${ZONES[building.zone].nameTh}`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="px-btn w-9 h-9 grid place-items-center bg-paper text-ink shrink-0">
            <X size={16} strokeWidth={3} aria-hidden="true" />
          </button>
        </header>

        {entry?.status === 'ready' && (
          <>
            <RoundTabs summary={summary} round={activeRound} onChange={reset(setRound)} zone={zone} />
            <FilterBar
              query={query}
              onQuery={reset(setQuery)}
              types={types}
              selected={selectedTypes}
              onToggleType={reset((t) => setSelectedTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t])))}
              onClearTypes={reset(() => setSelectedTypes([]))}
              sort={sort}
              onSort={reset(setSort)}
            />
          </>
        )}

        {body}

        <footer className="px-3 py-2 border-t-2 border-line bg-mist thai-font text-xs text-ink-soft shrink-0">
          {updated ? `ข้อมูลจาก MyTCAS อัปเดต ${updated}` : 'ข้อมูลจาก MyTCAS'}
        </footer>
      </section>
    </div>
  )
}
