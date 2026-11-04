import { useState } from 'react'
import Popup from '../ui/Popup'
import Button from '../ui/Button'
import TreeSprite from './TreeSprite'
import { useFocusStore } from '../../stores/useFocusStore'
import { validateFocusParams, treeFor, PLANNED_MIN } from '../../room/focusRules'
import { TREE_LABELS } from '../../room/messages'
import { useRoomUiStore } from '../../stores/useRoomUiStore'
import { isSubjectKey } from '../../utils/planDerive'
import { SCORE_LABELS } from '../../constants/scoreLabels'

const PRESETS = [25, 50, 90]
const MODES = [
  { id: 'strict', label: 'เข้มงวด', hint: 'ออกจากหน้านี้หรือล็อกจอเกิน 10 วินาที ต้นไม้เหี่ยว · ได้ใบไม้ ×1.5' },
  { id: 'flexible', label: 'ยืดหยุ่น', hint: 'พักได้ไม่เกิน 2 นาที · ได้ใบไม้ ×1' },
]

// Pick a duration and a mode, then plant the tree. The server re-validates everything.
export default function FocusSetupSheet({ onClose }) {
  const start = useFocusStore((s) => s.start)
  // The Plan's "อ่าน" opens this sheet for one exam subject; the student can drop it.
  const payloadKey = useRoomUiStore((s) => s.payload?.subjectKey)
  const [dropped, setDropped] = useState(false)
  const subjectKey = !dropped && isSubjectKey(payloadKey) ? payloadKey : null
  const [plannedText, setPlannedText] = useState('25')
  const [mode, setMode] = useState('flexible')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Digits only: anything else (empty, "2.5") is not a valid time and is rejected on start.
  const plannedMin = /^\d+$/.test(plannedText) ? Number(plannedText) : NaN
  const preview = Number.isInteger(plannedMin) && plannedMin >= PLANNED_MIN.min ? treeFor({ plannedMin, withered: false }) : null

  const begin = async () => {
    const check = validateFocusParams({ mode, plannedMin })
    if (!check.ok) {
      setError(check.code === 'bad_planned' ? `ใส่เวลาระหว่าง ${PLANNED_MIN.min}–${PLANNED_MIN.max} นาที` : 'เลือกโหมดก่อน')
      return
    }
    setError('')
    setBusy(true)
    try {
      await start({ mode: check.mode, plannedMin: check.plannedMin, ...(subjectKey ? { subjectKey } : {}) })
      onClose()
    } catch (e) {
      console.error('[FocusSetupSheet] start failed:', e)
      setError('เริ่มไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popup variant="sheet" size="sm" onClose={onClose}>
      <div className="p-5 flex flex-col gap-4">
        <h2 className="pixel-font text-lg text-ink">เริ่มโฟกัส</h2>

        {subjectKey && (
          <div className="flex items-center gap-2">
            <span className="px-chip bg-mist text-ink text-sm font-bold px-3 h-9 inline-flex items-center rounded-slot">{`วิชา: ${SCORE_LABELS[subjectKey]}`}</span>
            <button type="button" aria-label="ไม่ระบุวิชา" onClick={() => setDropped(true)} className="px-btn h-9 w-9 text-sm font-bold bg-paper text-ink">✕</button>
          </div>
        )}

        <div className="flex flex-wrap gap-2" role="group" aria-label="เวลา">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={plannedMin === n}
              onClick={() => setPlannedText(String(n))}
              className={`px-btn h-11 px-4 text-sm font-bold ${plannedMin === n ? 'bg-ink text-white' : 'bg-paper text-ink'}`}
            >
              {`${n} นาที`}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm font-bold text-ink" htmlFor="focus-custom">
          กำหนดเอง (นาที)
          <input
            id="focus-custom"
            inputMode="numeric"
            className="px-input h-11 px-3 bg-paper"
            value={plannedText}
            onChange={(e) => setPlannedText(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-2" role="group" aria-label="โหมด">
          <div className="flex gap-2">
            {MODES.map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={mode === x.id}
                onClick={() => setMode(x.id)}
                className={`px-btn flex-1 h-11 text-sm font-bold ${mode === x.id ? 'bg-ink text-white' : 'bg-paper text-ink'}`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-soft">{MODES.find((x) => x.id === mode).hint}</p>
        </div>

        <div className="flex items-center gap-3 text-sm text-ink">
          <TreeSprite species={preview ?? 'sprout'} stage={3} scale={1} />
          <span>{preview ? TREE_LABELS[preview] : '—'}</span>
        </div>

        {error && <p role="alert" className="text-sm font-bold text-danger">{error}</p>}
        <Button onClick={begin} disabled={busy}>เริ่มโฟกัส</Button>
      </div>
    </Popup>
  )
}
