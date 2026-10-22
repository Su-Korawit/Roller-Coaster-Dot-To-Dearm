import { useEffect, useState } from 'react'
import SpeechBubble from '../ui/SpeechBubble'
import { GUIDE_STEPS } from '../../constants/guideSteps'
import { HOTBAR_DOCK } from '../../constants/hotbarLayout'
import { Z_TOAST } from '../../constants/zIndex'
import { useGuideStore, isGuideActive } from '../../stores/useGuideStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useLeavesStore } from '../../stores/useLeavesStore'
import { useRoomStore } from '../../stores/useRoomStore'
import { useRoomUiStore } from '../../stores/useRoomUiStore'
import { useFocusStore } from '../../stores/useFocusStore'
import { usePopupStore } from '../../stores/usePopupStore'
import { buildGuideContext } from '../../lib/guideContext'

const POLL_MS = 400
const CROWDED_TOP = 76 // px: below the header pills, clear of every sheet's content

// Is `el` what the student would actually hit at its own centre? (Not hidden under a panel.)
function isOnTop(el, r) {
  if (typeof document.elementFromPoint !== 'function') return true
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  return !hit || el.contains(hit)
}

// Where on screen is the first of these elements that exists, is visible and is not covered?
function useTargetRect(selectors, active) {
  const [rect, setRect] = useState(null)
  const key = selectors.join('|')
  useEffect(() => {
    if (!active) return undefined
    const read = () => {
      const el = selectors.map((s) => document.querySelector(s)).find(Boolean)
      const r = el?.getBoundingClientRect()
      const next = r && r.width > 0 && r.height > 0 && isOnTop(el, r)
        ? { left: r.left, top: r.top, width: r.width, height: r.height }
        : null
      setRect((prev) => (prev && next && prev.left === next.left && prev.top === next.top && prev.width === next.width && prev.height === next.height ? prev : next))
    }
    const raf = requestAnimationFrame(read)
    const timer = setInterval(read, POLL_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key])
  return active ? rect : null
}

// The hands-on guide: a bubble with the current step and, when its target is on screen and
// uncovered, a spotlight around it. It never blocks input (dimming and spotlight ignore
// pointer events). While a sheet, a popup, decorate mode or the result screen is up the bubble
// moves to the top and the dimming stops, so it can never cover what the step sends the student
// to; behind a full-screen panel it is hidden altogether (`suspended`).
export default function GuideOverlay({ suspended = false }) {
  const started = useGuideStore((s) => s.started)
  const done = useGuideStore((s) => s.done)
  const skipped = useGuideStore((s) => s.skipped)
  const step = useGuideStore((s) => s.step)
  const signedIn = useAuthStore((s) => !!s.user)
  const packReady = useLeavesStore((s) => s.welcomePack === 'v2')
  const focusStatus = useFocusStore((s) => s.status)
  const focusPractice = useFocusStore((s) => s.practice)
  const roomSheet = useRoomUiStore((s) => s.sheet)
  const popup = usePopupStore((s) => s.activePopup)
  const decorating = useRoomStore((s) => s.decorating)
  const [error, setError] = useState('')

  const active = isGuideActive({ started, done, skipped, step })
  const current = active ? GUIDE_STEPS[step] : null
  const crowded = !!roomSheet || !!popup || decorating || focusStatus === 'done' || focusStatus === 'withered' || focusStatus === 'settling'

  useEffect(() => {
    useGuideStore.getState().setContextProvider(buildGuideContext)
    useGuideStore.getState().refresh()
  }, [])

  // First time a signed-in student has their room (welcome pack claimed): start.
  useEffect(() => {
    if (signedIn && packReady && !started && !done && !skipped) useGuideStore.getState().start()
  }, [signedIn, packReady, started, done, skipped])

  // Buying or placing elsewhere can make the current step moot.
  useEffect(() => {
    const refresh = () => useGuideStore.getState().refresh()
    const offs = [useLeavesStore.subscribe(refresh), useRoomStore.subscribe(refresh)]
    return () => offs.forEach((off) => off())
  }, [])

  const selectors = current ? [current.target, current.fallbackTarget].filter(Boolean) : []
  const rect = useTargetRect(selectors, !!current && !suspended && !crowded)

  if (!current || suspended) return null

  const startPractice = async () => {
    setError('')
    try {
      await useFocusStore.getState().start({ practice: true })
    } catch (e) {
      if (/PRACTICE_DONE/.test(String(e?.message))) {
        useLeavesStore.getState().applyServer({ practiceDone: true })
        useGuideStore.getState().refresh()
      } else {
        setError('เริ่มไม่สำเร็จ ลองใหม่อีกครั้ง')
      }
    }
  }

  const below = rect && rect.top < window.innerHeight / 2
  let place = { bottom: HOTBAR_DOCK }
  if (crowded) place = { top: CROWDED_TOP }
  else if (rect) place = below ? { top: rect.top + rect.height + 14 } : { bottom: window.innerHeight - rect.top + 14 }

  const isPractice = current.action === 'practice'

  return (
    <>
      {rect && (
        <div
          aria-hidden="true"
          data-guide-spotlight
          className="pointer-events-none fixed rounded-lg"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(43, 37, 80, 0.55)',
            zIndex: Z_TOAST,
          }}
        />
      )}
      <SpeechBubble className="fixed left-1/2 -translate-x-1/2" style={{ ...place, zIndex: Z_TOAST }}>
        <p className="thai-font text-sm">{current.textTh}</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {isPractice && focusStatus === 'idle' && (
            <button type="button" className="px-btn h-11 px-4 text-sm font-bold bg-leaf text-ink" onClick={startPractice}>
              เริ่มลองโฟกัส
            </button>
          )}
          {isPractice && focusStatus === 'running' && focusPractice && (
            <p className="text-xs text-ink-soft">กำลังลองโฟกัส… ครบ 1 นาทีแล้วจะได้ของขวัญเอง</p>
          )}
          {isPractice && focusStatus === 'running' && !focusPractice && (
            <p className="text-xs text-ink-soft">จบโฟกัสที่กำลังทำอยู่ก่อน แล้วค่อยลองใหม่</p>
          )}
          <button type="button" className="px-btn h-11 px-4 text-sm font-bold bg-paper text-ink" onClick={() => useGuideStore.getState().skip()}>
            ข้าม
          </button>
        </div>
      </SpeechBubble>
    </>
  )
}
