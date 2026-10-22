import { useEffect, useRef, useState } from 'react'
import TreeSprite from './TreeSprite'
import { useFocusStore } from '../../stores/useFocusStore'
import { createFocusGuard } from '../../room/focusGuard'
import { focusProgress, growthStage, isDue } from '../../room/focusProgress'
import { treeFor } from '../../room/focusRules'
import { CHECKIN_PROMPT_MS } from '../../services/focus'
import { Z_HUD } from '../../constants/zIndex'

const MODE_LABELS = { strict: 'เข้มงวด', flexible: 'ยืดหยุ่น' }

const clock = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// The running session: time left (from the server's start time), the growing tree, and the
// rules enforced while it runs — leaving the page withers the tree (timestamps, not ticks),
// and a check-in is asked for every CHECKIN_PROMPT_MS.
export default function FocusHud() {
  const status = useFocusStore((s) => s.status)
  const mode = useFocusStore((s) => s.mode)
  const plannedMin = useFocusStore((s) => s.plannedMin)
  const startedAt = useFocusStore((s) => s.startedAt)
  const lastCheckInAt = useFocusStore((s) => s.lastCheckInAt)
  const [now, setNow] = useState(() => Date.now())
  const ending = useRef(false)

  const running = status === 'running'

  useEffect(() => {
    if (!running) return undefined
    // The guard fires once, so a failed abandon (offline) is retried here instead.
    const settleWithered = async (why) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await useFocusStore.getState().abandon(why)
          return
        } catch {
          await new Promise((r) => setTimeout(r, 3000))
          if (useFocusStore.getState().status !== 'running') return
        }
      }
    }
    const guard = createFocusGuard({ mode, onWither: settleWithered })
    // Strict only: keep the screen awake so an auto-lock is not mistaken for leaving.
    let lock = null
    const takeLock = () => {
      if (mode !== 'strict' || !navigator.wakeLock) return
      navigator.wakeLock.request('screen').then((l) => { lock = l }).catch(() => {})
    }
    takeLock()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') return guard.onHidden()
      guard.onVisible()
      takeLock()
    }
    document.addEventListener('visibilitychange', onVisibility)
    const timer = setInterval(() => {
      guard.tick()
      setNow(Date.now())
    }, 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      clearInterval(timer)
      lock?.release?.().catch(() => {})
    }
  }, [running, mode])

  const progress = focusProgress({ startedAt, plannedMin, now })

  // The planned time is up: settle the session once.
  useEffect(() => {
    if (running && isDue({ startedAt, plannedMin, now }) && !ending.current) {
      ending.current = true
      // A failed end (offline) is retried on a later tick; the store resets itself when the
      // server has no such session any more.
      useFocusStore.getState().end().catch(() => {}).finally(() => { ending.current = false })
    }
  }, [running, startedAt, plannedMin, now])

  if (!running) return null

  const needsCheckIn = now - lastCheckInAt >= CHECKIN_PROMPT_MS

  return (
    <div className="absolute top-20 right-4 px-slab flex flex-col items-center gap-2 p-3" style={{ zIndex: Z_HUD }}>
      <TreeSprite species={treeFor({ plannedMin, withered: false })} stage={growthStage(progress)} scale={2} />
      <span className="pixel-font text-lg text-ink">{clock(plannedMin * 60000 - (now - startedAt))}</span>
      <span className="text-xs font-bold text-ink-soft">{MODE_LABELS[mode]}</span>
      {needsCheckIn && (
        <button type="button" className="px-btn h-11 px-4 text-sm font-bold bg-leaf text-ink" onClick={() => useFocusStore.getState().checkIn().catch(() => {})}>
          ฉันยังอยู่
        </button>
      )}
      <button type="button" className="text-xs text-ink-soft underline h-11 px-2" onClick={() => useFocusStore.getState().end().catch(() => {})}>
        จบตอนนี้
      </button>
    </div>
  )
}
