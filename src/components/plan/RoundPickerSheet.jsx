import { useState } from 'react'
import Popup from '../ui/Popup'
import { usePlansStore } from '../../stores/usePlansStore'
import { useRoomUiStore } from '../../stores/useRoomUiStore'
import { useTcasEventsStore } from '../../stores/useTcasEventsStore'
import { eventsForPlan } from '../../data/tcas70'
import { roundStatus, nextFreeRank, RANK_MAX } from '../../utils/planDerive'
import { localToday } from '../../lib/hotbarBadges'

const ROUND_NAMES = { 1: 'Portfolio', 2: 'Quota', 3: 'Admission', 4: 'Direct' }
const ERRORS = {
  cap: 'แผนเต็มแล้ว ปลดล็อกช่องแผนเพิ่มได้ในร้านค้า',
  duplicate: 'หลักสูตรนี้อยู่ในแผนรอบนี้แล้ว',
  rank_full: 'รอบ 3 เลือกได้สูงสุด 10 อันดับ',
  bad_round: 'เลือกรอบไม่ถูกต้อง',
  bad_program: 'เพิ่มหลักสูตรนี้ไม่ได้',
}

// "+ เพิ่มเข้าแผน": pick the round (and the project when the round has several), then add. The
// round rows say what is true from data only: closed (calendar), not announced (no projects),
// the next round-3 rank, and for Quota a pointer to MyTCAS (we never claim eligibility).
export default function RoundPickerSheet({ program, onClose, today = localToday() }) {
  const plans = usePlansStore((s) => s.plans)
  const storedEvents = useTcasEventsStore((s) => s.events)
  const events = eventsForPlan(storedEvents)
  const [round, setRound] = useState(null)
  const [projectIdx, setProjectIdx] = useState(0)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(null)

  const roundsData = new Map((program.rounds ?? []).map((r) => [r.round, r.projects ?? []]))
  const rows = [1, 2, 3, 4].map((n) => {
    const projects = roundsData.get(n) ?? []
    const status = roundStatus({ round: n, hasProjects: projects.length > 0, events, today })
    const rank = n === 3 ? nextFreeRank(plans) : null
    const full = n === 3 && rank === null
    return { n, projects, status, rank, disabled: status === 'closed' || full, full }
  })
  const chosen = rows.find((r) => r.n === round)

  const statusText = (r) => {
    if (r.full) return `เต็ม ${RANK_MAX} อันดับแล้ว`
    if (r.status === 'closed') return 'ปิดรับแล้ว'
    if (r.status === 'unannounced') return 'ยังไม่ประกาศ'
    if (r.n === 3) return `อันดับ ${r.rank} จาก ${RANK_MAX}`
    return `${r.projects.length} โครงการ`
  }

  const add = () => {
    if (!chosen) return
    const project = chosen.projects[projectIdx] ?? chosen.projects[0] ?? null
    const res = usePlansStore.getState().addFromProgram({
      universityId: program.universityId,
      universityName: program.universityName,
      programId: program.programId,
      programName: program.programName,
      buildingId: program.buildingId,
      round: chosen.n,
      projectName: project?.nameTh ?? null,
      minGpax: project?.minGpax ?? null,
      scores: project?.scores ?? [],
    })
    if (res.ok) {
      setError('')
      setAdded({ round: chosen.n, rank: res.rank })
    } else {
      setError(ERRORS[res.reason] ?? ERRORS.bad_program)
    }
  }

  const seePlan = () => {
    useRoomUiStore.getState().open('plan')
    onClose()
  }

  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <div className="p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <h2 className="pixel-font text-lg text-ink">เพิ่มเข้าแผน</h2>
          <p className="thai-font text-sm font-bold text-ink">{program.programName}</p>
          <p className="thai-font text-sm text-ink-soft">{program.universityName}</p>
        </div>

        {added ? (
          <div className="flex flex-col gap-3">
            <p role="status" className="thai-font text-sm text-ink">
              {`เพิ่ม ${program.programName} เข้ารอบ ${added.round}${added.rank ? ` อันดับ ${added.rank}` : ''} แล้ว`}
            </p>
            <div className="flex gap-2">
              <button type="button" className="px-btn h-11 px-4 text-sm font-bold bg-leaf text-ink flex-1" onClick={seePlan}>ดูแผน</button>
              <button type="button" className="px-btn h-11 px-4 text-sm font-bold bg-paper text-ink" onClick={onClose}>ปิด</button>
            </div>
          </div>
        ) : (
          <>
            <div role="radiogroup" aria-label="เลือกรอบ" className="flex flex-col gap-2">
              {rows.map((r) => (
                <button
                  key={r.n}
                  type="button"
                  role="radio"
                  aria-checked={round === r.n}
                  aria-disabled={r.disabled}
                  onClick={() => {
                    if (r.disabled) return
                    setRound(r.n)
                    setProjectIdx(0)
                    setError('')
                  }}
                  className={`text-left rounded-ui border-2 px-3 py-2 flex flex-col gap-0.5 ${round === r.n ? 'border-line bg-paper shadow-px' : 'border-hairline bg-mist'} ${r.disabled ? 'opacity-60' : ''}`}
                >
                  <span className="flex justify-between gap-2 thai-font text-sm text-ink">
                    <span><b>{`รอบ ${r.n}`}</b>{` ${ROUND_NAMES[r.n]}`}</span>
                    <span className="text-ink-soft">{statusText(r)}</span>
                  </span>
                  {r.n === 2 && <span className="text-xs text-ink-soft">ตรวจเงื่อนไขพื้นที่ใน MyTCAS</span>}
                </button>
              ))}
            </div>

            {chosen && chosen.projects.length > 1 && (
              <div role="radiogroup" aria-label="เลือกโครงการ" className="flex flex-col gap-2">
                <p className="thai-font text-sm font-bold text-ink">เลือกโครงการ</p>
                {chosen.projects.map((p, i) => (
                  <button
                    key={`${p.nameTh}-${i}`}
                    type="button"
                    role="radio"
                    aria-checked={projectIdx === i}
                    onClick={() => setProjectIdx(i)}
                    className={`text-left rounded-ui border-2 px-3 py-2 thai-font text-sm text-ink ${projectIdx === i ? 'border-line bg-paper' : 'border-hairline bg-mist'}`}
                  >
                    {`${p.nameTh ?? 'โครงการ'} · ${p.seats ?? '-'} ที่นั่ง`}
                  </button>
                ))}
              </div>
            )}

            {error && <p role="alert" className="thai-font text-sm text-danger">{error}</p>}
            <button type="button" disabled={!chosen} onClick={add} className="px-btn h-11 px-4 text-sm font-bold bg-ink text-white disabled:opacity-50">
              เพิ่มเข้าแผน
            </button>
          </>
        )}
      </div>
    </Popup>
  )
}
