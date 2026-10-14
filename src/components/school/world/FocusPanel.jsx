import { useEffect, useState } from 'react'
import Popup from '../../ui/Popup'
import PanelHeader from '../../ui/PanelHeader'
import { useSchoolWorldStore } from '../../../stores/useSchoolWorldStore'
import { beginFocus, confirmFocus, finishFocus } from '../../../services/schoolWorld'
import { CHECKIN_PROMPT_MS, msUntilCheckIn } from '../../../services/focus'
import { formatDuration, formatVerified, focusMessage } from '../../../utils/formatFocus'
import { TEMPERAMENTS } from '../../../constants/temperaments'
import { useUserStore } from '../../../stores/useUserStore'
import { levelProgress } from '../../../utils/level'

// Opens when the student walks up to a Library seat. The server owns all time
// and XP; this panel only asks and displays (see services/schoolWorld.js).
export default function FocusPanel({ seatId, onClose }) {
  const focus = useSchoolWorldStore((s) => s.focus)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (focus.status !== 'active') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [focus.status])

  const active = focus.status === 'active'
  const due = active && msUntilCheckIn(focus.lastCheckInAt, now) === 0
  const message = focusMessage(focus.lastResult, focus.error)
  const focusXp = useUserStore((s) => s.focusXp)
  const level = levelProgress(focusXp)
  const perk = TEMPERAMENTS[focus.temperament] ?? null
  const perkActive = (focus.lastResult?.multiplier ?? 1) > 1

  return (
    <Popup variant="sheet" size="sm" onClose={onClose}>
      <PanelHeader title="โต๊ะอ่านหนังสือ" onClose={onClose} />
      <div className="p-4 flex flex-col gap-3 overflow-y-auto">
        {!active && (
          <>
            <p className="thai-font text-sm text-ink">
              เริ่มนั่งอ่านหนังสือที่โต๊ะนี้ ระบบจะนับเฉพาะเวลาที่ยืนยันตัวเองว่ายังอยู่ ทุก ๆ {CHECKIN_PROMPT_MS / 60000} นาที
              เวลาที่นับจะรวมเป็นคะแนนของโรงเรียนในตารางอันดับประจำสัปดาห์
            </p>
            <p className="thai-font text-xs text-ink/60">แค่เปิดหน้าเว็บทิ้งไว้ไม่นับเวลา · นับสูงสุดวันละ 8 ชั่วโมง</p>
            <button
              onClick={beginFocus}
              disabled={focus.busy}
              className="neo-btn rpg-btn-primary pixel-font text-[11px] py-3 rounded-lg disabled:opacity-50"
            >
              {focus.busy ? 'กำลังเริ่ม…' : 'เริ่มอ่านหนังสือ'}
            </button>
          </>
        )}

        {active && (
          <>
            <div className="neo-slab p-3 flex items-center justify-between">
              <div>
                <div className="thai-font text-xs text-ink/60">เวลาที่ยืนยันแล้ว</div>
                <div className="pixel-font text-lg text-ink" data-testid="focus-verified">{formatVerified(focus.verifiedMs)}</div>
              </div>
              <div className="text-right">
                <div className="thai-font text-xs text-ink/60">ได้รับในรอบนี้</div>
                <div className="pixel-font text-lg text-brand-strong" data-testid="focus-xp">+{focus.xpThisSession} XP</div>
              </div>
            </div>

            {focusXp > 0 && (
              <div className="flex items-center gap-2" data-testid="focus-level">
                <span className="rpg-coin pixel-font text-[10px]" aria-label={`เลเวล ${level.level}`}>{level.level}</span>
                <div className="rpg-bar flex-1" style={{ '--pct': Math.round(level.ratio * 100) }}><i /></div>
              </div>
            )}

            <div className="thai-font text-sm text-ink text-center" data-testid="focus-next">
              {due
                ? 'ถึงเวลายืนยันแล้ว กดปุ่มด้านล่างเพื่อนับเวลาต่อ'
                : `ยืนยันครั้งถัดไปในอีก ${formatDuration(msUntilCheckIn(focus.lastCheckInAt, now))}`}
            </div>
            <div
              className="rpg-bar rpg-bar--heart"
              style={{ '--pct': Math.round(100 - (msUntilCheckIn(focus.lastCheckInAt, now) / CHECKIN_PROMPT_MS) * 100) }}
              role="progressbar" aria-label="เวลาก่อนยืนยันครั้งถัดไป" aria-valuemin={0} aria-valuemax={100}
            >
              <i />
            </div>

            <button
              onClick={confirmFocus}
              disabled={focus.busy}
              className={`neo-btn pixel-font text-[11px] py-3 rounded-lg disabled:opacity-50 ${due ? 'rpg-btn-primary animate-pulse' : 'bg-surface text-ink'}`}
            >
              ฉันยังอยู่ ✓
            </button>
            <button
              onClick={finishFocus}
              disabled={focus.busy}
              className="neo-btn bg-surface text-ink pixel-font text-[11px] py-3 rounded-lg disabled:opacity-50"
            >
              จบการอ่าน
            </button>
          </>
        )}

        {perk && (
          <p className="thai-font text-xs text-ink/70" data-testid="focus-perk">
            {perk.emoji} {perk.perk}: {perk.description}
            {perkActive && <strong className="text-brand-strong"> · โบนัสกำลังทำงาน +10%</strong>}
          </p>
        )}
        {message && <p role="status" className="thai-font text-xs text-accent-pink">{message}</p>}
        {seatId && <p className="thai-font text-[10px] text-ink/40">โต๊ะ {seatId}</p>}
      </div>
    </Popup>
  )
}
