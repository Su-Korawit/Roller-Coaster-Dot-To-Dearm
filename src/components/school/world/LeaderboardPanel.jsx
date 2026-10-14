import { useEffect, useState } from 'react'
import Popup from '../../ui/Popup'
import PanelHeader from '../../ui/PanelHeader'
import { fetchLeaderboard, contributorsNeeded, MIN_CONTRIBUTORS } from '../../../services/leaderboard'
import { formatWeekLeft } from '../../../utils/formatFocus'

const MEDALS = ['🥇', '🥈', '🥉']

// Weekly table of schools by verified study hours per registered member.
export default function LeaderboardPanel({ mySchoolId, onClose }) {
  const [state, setState] = useState({ status: 'loading', data: null })

  useEffect(() => {
    let cancelled = false
    fetchLeaderboard({ mySchoolId })
      .then((data) => { if (!cancelled) setState({ status: 'ready', data }) })
      .catch(() => { if (!cancelled) setState({ status: 'error', data: null }) })
    return () => { cancelled = true }
  }, [mySchoolId])

  const { status, data } = state

  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <PanelHeader title="อันดับโรงเรียน" onClose={onClose} />
      <div className="p-4 flex flex-col gap-3 overflow-y-auto">
        {status === 'loading' && <p className="thai-font text-sm text-ink/60">กำลังโหลด…</p>}
        {status === 'error' && <p role="alert" className="thai-font text-sm text-accent-pink">โหลดอันดับไม่สำเร็จ ลองใหม่อีกครั้ง</p>}

        {status === 'ready' && !data && (
          <p className="thai-font text-sm text-ink">ยังไม่มีข้อมูลสัปดาห์นี้ มานั่งอ่านหนังสือด้วยกันเป็นกลุ่มแรกเลย</p>
        )}

        {status === 'ready' && data && (
          <>
            <p className="thai-font text-xs text-ink/60">
              ชั่วโมงอ่านหนังสือเฉลี่ยต่อสมาชิกของโรงเรียน · {formatWeekLeft(data.endsAtMs)}
            </p>

            {data.mine && (
              <div className="neo-slab p-3 thai-font text-sm text-ink" data-testid="my-school">
                <div className="font-bold">{data.mine.schoolName ?? 'โรงเรียนของคุณ'}</div>
                {data.mine.rank
                  ? <div>อันดับที่ {data.mine.rank} · เฉลี่ย {data.mine.avgHoursPerMember} ชม./คน</div>
                  : <div>ชวนเพื่อนอีก {contributorsNeeded(data.mine)} คนมานั่งอ่านด้วยกัน (ต้องมีอย่างน้อย {MIN_CONTRIBUTORS} คนถึงจะติดอันดับ)</div>}
              </div>
            )}

            {data.schools.length === 0 && (
              <p className="thai-font text-sm text-ink">ยังไม่มีโรงเรียนที่ครบ {MIN_CONTRIBUTORS} คนในสัปดาห์นี้</p>
            )}

            <ol className="flex flex-col gap-1.5">
              {data.schools.map((s) => (
                <li
                  key={s.schoolId}
                  className={`flex items-center gap-3 px-3 py-2 border-2 border-ink rounded-lg bg-surface ${s.schoolId === mySchoolId ? 'ring-2 ring-brand' : ''}`}
                >
                  <span className="pixel-font text-[11px] w-7 text-center">{MEDALS[s.rank - 1] ?? s.rank}</span>
                  <span className="thai-font text-sm text-ink flex-1 truncate">{s.schoolName ?? 'โรงเรียน'}</span>
                  <span className="pixel-font text-[10px] text-brand-strong">{s.avgHoursPerMember} ชม.</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </Popup>
  )
}
