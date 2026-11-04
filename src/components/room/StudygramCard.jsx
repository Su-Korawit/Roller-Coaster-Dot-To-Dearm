import { useCallback, useEffect, useRef, useState } from 'react'
import Popup from '../ui/Popup'
import { cardLayers } from '../../room/cardLayers'
import { renderCard } from '../../lib/renderCard'
import { shareImage } from '../../lib/shareImage'
import { useLeavesStore } from '../../stores/useLeavesStore'
import { useRoomStore } from '../../stores/useRoomStore'
import { usePlansStore } from '../../stores/usePlansStore'
import { useUserStore } from '../../stores/useUserStore'
import { useFxStore } from '../../stores/useFxStore'
import { Z_MODAL } from '../../constants/zIndex'

// session: { tree, withered, mode, verifiedMs, plannedMin, endedAt } of a finished focus session (the
// completion screen passes the result; the history sheet passes a stored one). The card shows the
// student's room as it is now with that session's tree and time; goal and streak are opt-in.
export default function StudygramCard({ session, onClose }) {
  const [showGoal, setShowGoal] = useState(false)
  const [showStreak, setShowStreak] = useState(false)
  const [preview, setPreview] = useState(null) // { blob, url }
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const busyRef = useRef(false)
  const urlRef = useRef(null)

  const goal = usePlansStore((s) => s.plans[0])
  const streak = useUserStore((s) => s.streak)
  const goalText = goal?.programName ? [goal.programName, goal.universityName].filter(Boolean).join(' ') : ''

  const build = useCallback(async () => {
    const { layout, catalog } = useRoomStore.getState()
    const layers = cardLayers({
      now: new Date(session.endedAt ?? Date.now()),
      layout,
      catalog,
      inventory: useLeavesStore.getState().inventory,
      tree: session.tree,
      withered: !!session.withered,
      pet: layout.petId,
      strict: session.mode === 'strict',
      minutes: Math.floor((session.verifiedMs ?? 0) / 60000),
      dayNumber: streak > 0 ? streak : undefined,
      showGoal,
      goalText,
      showStreak,
      streak,
    })
    return renderCard({ layers })
  }, [session, showGoal, showStreak, goalText, streak])

  useEffect(() => {
    let alive = true
    setFailed(false)
    build().then((blob) => {
      if (!alive) return
      const url = URL.createObjectURL(blob)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = url
      setPreview({ blob, url })
    }).catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [build, attempt])

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  const send = async (saveOnly) => {
    if (!preview || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const outcome = await shareImage(preview.blob, 'ilovetcas-studygram.png', { saveOnly })
      const text = outcome === 'shared' ? 'แชร์การ์ดแล้ว' : outcome === 'downloaded' ? 'บันทึกรูปแล้ว' : null
      if (text) useFxStore.getState().push({ kind: 'info', text })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <Popup variant="center" size="sm" zIndex={Z_MODAL + 1} onClose={onClose}>
      <div className="p-4 flex flex-col gap-3 items-center">
        <h2 className="pixel-font text-lg text-ink">การ์ดโฟกัส</h2>
        {failed ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <p className="thai-font text-sm text-ink">สร้างการ์ดไม่สำเร็จ</p>
            <button type="button" className="px-btn h-11 px-4 text-sm font-bold bg-leaf text-ink" onClick={() => setAttempt((n) => n + 1)}>ลองใหม่</button>
          </div>
        ) : preview ? (
          <img src={preview.url} alt="ตัวอย่างการ์ด" className="w-full max-w-[280px] border-2 border-line rounded-ui" style={{ imageRendering: 'pixelated', aspectRatio: '4 / 5' }} />
        ) : (
          <div className="w-full max-w-[280px] border-2 border-line rounded-ui bg-mist" style={{ aspectRatio: '4 / 5' }} aria-busy="true" />
        )}

        <label className="thai-font text-sm text-ink flex items-center gap-2 self-start">
          <input type="checkbox" checked={showGoal} disabled={!goalText} onChange={(e) => setShowGoal(e.target.checked)} aria-label="แสดงคณะที่ตั้งเป้า" />
          แสดงคณะที่ตั้งเป้า
        </label>
        <label className="thai-font text-sm text-ink flex items-center gap-2 self-start">
          <input type="checkbox" checked={showStreak} disabled={!(streak > 0)} onChange={(e) => setShowStreak(e.target.checked)} aria-label="แสดงจำนวนวันติดต่อกัน" />
          แสดงจำนวนวันติดต่อกัน
        </label>
        <p className="thai-font text-xs text-ink-soft self-start">การ์ดไม่มีชื่อ โรงเรียน หรืออีเมลของคุณ</p>

        <div className="flex gap-2 w-full">
          <button type="button" disabled={!preview || busy} className="px-btn h-11 text-sm font-bold bg-leaf text-ink flex-1 disabled:opacity-60" onClick={() => send(false)}>แชร์</button>
          <button type="button" disabled={!preview || busy} className="px-btn h-11 text-sm font-bold bg-paper text-ink flex-1 disabled:opacity-60" onClick={() => send(true)}>บันทึกรูป</button>
          <button type="button" className="px-btn h-11 px-3 text-sm font-bold bg-paper text-ink" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </Popup>
  )
}
