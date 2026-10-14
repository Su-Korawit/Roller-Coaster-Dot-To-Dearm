import { useEffect, useState } from 'react'
import { useSchoolWorldStore } from '../../../stores/useSchoolWorldStore'
import { confirmFocus } from '../../../services/schoolWorld'
import { msUntilCheckIn } from '../../../services/focus'
import { formatDuration } from '../../../utils/formatFocus'

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

  if (focus.status !== 'active') return null
  const left = msUntilCheckIn(focus.lastCheckInAt, now)
  const due = left === 0

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
    </div>
  )
}
