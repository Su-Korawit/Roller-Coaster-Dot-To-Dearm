// ─────────────────────────────────────────────────────────────────────────────
// DailyLoginModal — Once-per-day mood check-in popup.
// Triggered from HomePage when lastLoginDate !== today.
// On selection: calls addDailyFeel(level), increments totalStacks.
// Displays a MoodHeatmap after selection (or can be dismissed).
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useUserStore } from '../stores/useUserStore'
import { useSchoolStore } from '../stores/useSchoolStore'
import { noteFor } from '../utils/schoolDayView'
import { cyclePosition, motivationMessage } from '../utils/streakCycle'
import MoodHeatmap from './MoodHeatmap'
import Popup from './ui/Popup'
import { Z_MODAL_ABOVE } from '../constants/zIndex'

const MOODS = [
  { level: 1, emoji: '😔', label: 'Rough' },
  { level: 2, emoji: '😐', label: 'Low' },
  { level: 3, emoji: '🙂', label: 'Okay' },
  { level: 4, emoji: '😊', label: 'Good' },
  { level: 5, emoji: '🤩', label: 'Great!' },
]

const BG_COLORS = {
  1: 'bg-paper border-ink/30',
  2: 'bg-brand-soft border-brand/30',
  3: 'bg-warn/10 border-warn/30',
  4: 'bg-good/10 border-good/30',
  5: 'bg-good/20 border-good/40',
}

const SELECTED_RING = {
  1: 'ring-ink/40',
  2: 'ring-brand',
  3: 'ring-warn',
  4: 'ring-good',
  5: 'ring-good',
}

export default function DailyLoginModal({ onClose, today }) {
  const todayStr = today ?? new Date().toISOString().slice(0, 10)
  const notes = useSchoolStore((s) => s.notes)
  const upsertNote = useSchoolStore((s) => s.upsertNote)
  const [selected, setSelected] = useState(null)
  const [saved, setSaved] = useState(false)
  const [streakResult, setStreakResult] = useState(null)
  const [reflection, setReflection] = useState('')
  const [reflectionSaved, setReflectionSaved] = useState(false)
  const addDailyFeel = useUserStore((s) => s.addDailyFeel)
  const feelingNotes = useUserStore((s) => s.feelingNotes)
  const totalStacks = useUserStore((s) => s.totalStacks)

  function handleSelect(level) {
    if (saved) return
    setSelected(level)
  }

  function handleConfirm() {
    if (!selected || saved) return
    setStreakResult(addDailyFeel(selected, todayStr))
    setSaved(true)
  }

  function handleSaveReflection() {
    if (!reflection.trim() || reflectionSaved) return
    const line = `🔥 Day ${streakResult.streak}: ${reflection.trim()}`
    const existing = noteFor(notes, todayStr, null)
    upsertNote({
      date: todayStr,
      subjectId: null,
      text: existing?.text ? `${existing.text}\n${line}` : line,
    })
    setReflectionSaved(true)
  }

  return (
    <Popup variant="sheet" size="md" zIndex={Z_MODAL_ABOVE} onClose={saved ? onClose : undefined}>
      <div className="px-5 pt-5 pb-8 flex flex-col gap-4 overflow-y-auto">
        {!saved ? (
          <>
            {/* Header */}
            <div className="text-center">
              <p className="pixel-font text-xs text-ink mb-1">How are you today?</p>
              <p className="text-xs text-ink-soft">Tap a mood to check in — unlocks your daily stack!</p>
            </div>

            {/* Mood buttons */}
            <div className="flex gap-2 justify-center">
              {MOODS.map(({ level, emoji, label }) => (
                <button
                  key={level}
                  onClick={() => handleSelect(level)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-95
                    ${BG_COLORS[level]}
                    ${selected === level ? `ring-2 ring-offset-1 scale-105 ${SELECTED_RING[level]}` : ''}`}
                >
                  <span className="text-2xl leading-none">{emoji}</span>
                  <span className="pixel-font text-xs text-ink-soft">{label}</span>
                </button>
              ))}
            </div>

            {/* Confirm */}
            <button
              onClick={handleConfirm}
              disabled={!selected}
              className="w-full rounded-xl bg-ink text-white py-3 pixel-font text-xs active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {selected ? `Check In as "${MOODS[selected - 1].label}"` : 'Select a mood first'}
            </button>

            {/* Skip */}
            <button
              onClick={onClose}
              className="text-center pixel-font text-xs text-ink-soft active:opacity-60"
            >
              Skip for today
            </button>
          </>
        ) : (
          <>
            {/* Motivation screen */}
            <div className="text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-warn border-4 border-ink flex items-center justify-center mb-2">
                <span className="text-3xl" aria-hidden="true">🔥</span>
              </div>
              <p className="pixel-font text-[16px] text-ink mb-1">{streakResult?.streak ?? 0} Day</p>
              <p className="thai-font text-sm text-ink-soft mb-3">{motivationMessage(streakResult?.streak ?? 0, streakResult?.broken ?? false)}</p>
              <div className="flex justify-center gap-2 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    data-testid="streak-dot"
                    data-lit={i <= cyclePosition(streakResult?.streak ?? 0) ? 'true' : 'false'}
                    className={`w-6 h-6 rounded-full border-2 border-ink flex items-center justify-center pixel-font text-xs ${
                      i <= cyclePosition(streakResult?.streak ?? 0) ? 'bg-warn text-ink' : 'bg-paper text-ink-soft'
                    }`}
                  >
                    {i}
                  </span>
                ))}
              </div>
              <p className="text-xs text-ink-soft">
                Stack +1! Total: <span className="font-bold text-accent-pink">{totalStacks}</span>
              </p>
            </div>

            {/* Reflection → Notebook */}
            <div>
              {reflectionSaved ? (
                <p className="thai-font text-center text-sm text-brand-strong">บันทึกลง Notebook แล้ว ✓</p>
              ) : (
                <div className="flex gap-2">
                  <input
                    aria-label="บันทึกความรู้สึก"
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="วันนี้เป็นยังไงบ้าง..."
                    className="px-input thai-font flex-1 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleSaveReflection}
                    className="px-btn rounded-lg bg-brand-strong px-4 py-2 pixel-font text-xs text-white"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Heatmap */}
            <div className="bg-paper border border-hairline rounded-2xl p-4">
              <p className="pixel-font text-xs text-ink-soft mb-3">Mood Log — Past Year</p>
              <MoodHeatmap feelingNotes={feelingNotes} />
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-ink text-white py-3 pixel-font text-xs active:scale-95 transition-transform"
            >
              Let&apos;s go!
            </button>
          </>
        )}
      </div>
    </Popup>
  )
}
