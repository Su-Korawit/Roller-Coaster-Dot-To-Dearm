import { useEffect, useState } from 'react'
import { useSchoolWorldStore } from '../../../stores/useSchoolWorldStore'
import { confirmFocus } from '../../../services/schoolWorld'
import { msUntilCheckIn, CHECKIN_PROMPT_MS } from '../../../services/focus'
import { formatDuration } from '../../../utils/formatFocus'
import { playSound } from '../../../lib/sfx'

// Always-visible pill while a Focus session runs, so the student can leave the
// seat, keep the tab open all day, and still see (and one-tap) the next check-in.
export default function FocusHud() {
  const focus = useSchoolWorldStore((s) => s.focus)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (focus.status !== 'active') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [focus.status])

  const active = focus.status === 'active'
  const left = active ? msUntilCheckIn(focus.lastCheckInAt, now) : null
  const due = active && left === 0

  // A tab left open all day needs a nudge: a chime, and a bell in the tab title,
  // exactly when a check-in becomes due (and again every minute while it is ignored).
  useEffect(() => {
    if (!due) return undefined
    const original = document.title
    document.title = '🔔 ยืนยันว่ายังอยู่ · ' + original
    playSound('chime')
    const t = setInterval(() => playSound('chime'), 60_000)
    return () => { clearInterval(t); document.title = original }
  }, [due])

  if (!active) return null

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <button
        onClick={due ? confirmFocus : undefined}
        disabled={focus.busy}
        aria-label={due ? 'ยืนยันว่ายังอยู่' : 'กำลังนับเวลาอ่านหนังสือ'}
        className={`neo-slab flex items-center gap-2 px-3 py-1.5 pixel-font text-[10px] ${due ? 'animate-pulse text-accent-pink' : 'text-ink'}`}
      >
        <span aria-hidden="true">📚</span>
        {due ? 'ยังอยู่ไหม? แตะเพื่อยืนยัน' : `ยืนยันใน ${formatDuration(left)}`}
        <span className="text-brand-strong">+{focus.xpThisSession}</span>
      </button>
      <div
        className="rpg-bar rpg-bar--heart mt-1.5 mx-1" style={{ '--pct': Math.round(100 - (left / CHECKIN_PROMPT_MS) * 100), height: '8px' }}
        aria-hidden="true"
      >
        <i />
      </div>
    </div>
  )
}
