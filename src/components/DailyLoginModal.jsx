// ─────────────────────────────────────────────────────────────────────────────
// DailyLoginModal — Once-per-day mood check-in popup.
// Triggered from HomePage when lastLoginDate !== today.
// On selection: calls addDailyFeel(level), increments totalStacks.
// Displays a MoodHeatmap after selection (or can be dismissed).
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useUserStore } from '../stores/useUserStore'
import MoodHeatmap from './MoodHeatmap'

const MOODS = [
  { level: 1, emoji: '😔', label: 'Rough' },
  { level: 2, emoji: '😐', label: 'Low' },
  { level: 3, emoji: '🙂', label: 'Okay' },
  { level: 4, emoji: '😊', label: 'Good' },
  { level: 5, emoji: '🤩', label: 'Great!' },
]

const BG_COLORS = {
  1: 'bg-gray-100 border-gray-300',
  2: 'bg-blue-50  border-blue-200',
  3: 'bg-yellow-50 border-yellow-200',
  4: 'bg-green-50  border-green-200',
  5: 'bg-emerald-50 border-emerald-300',
}

const SELECTED_RING = {
  1: 'ring-gray-400',
  2: 'ring-blue-300',
  3: 'ring-yellow-300',
  4: 'ring-green-400',
  5: 'ring-emerald-400',
}

export default function DailyLoginModal({ onClose }) {
  const [selected, setSelected] = useState(null)
  const [saved, setSaved] = useState(false)
  const { addDailyFeel, feelingNotes, totalStacks } = useUserStore()

  function handleSelect(level) {
    if (saved) return
    setSelected(level)
  }

  function handleConfirm() {
    if (!selected || saved) return
    addDailyFeel(selected)
    setSaved(true)
  }

  return (
    <div className="absolute inset-0 z-90 flex flex-col items-center justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={saved ? onClose : undefined}
      />

      {/* Sheet */}
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="flex justify-center -mt-1 mb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {!saved ? (
          <>
            {/* Header */}
            <div className="text-center">
              <p className="pixel-font text-[11px] text-gray-800 mb-1">How are you today?</p>
              <p className="text-xs text-gray-400">Tap a mood to check in — unlocks your daily stack!</p>
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
                  <span className="pixel-font text-[7px] text-gray-600">{label}</span>
                </button>
              ))}
            </div>

            {/* Confirm */}
            <button
              onClick={handleConfirm}
              disabled={!selected}
              className="w-full rounded-xl bg-gray-900 text-white py-3 pixel-font text-[10px] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {selected ? `Check In as "${MOODS[selected - 1].label}"` : 'Select a mood first'}
            </button>

            {/* Skip */}
            <button
              onClick={onClose}
              className="text-center pixel-font text-[8px] text-gray-400 active:opacity-60"
            >
              Skip for today
            </button>
          </>
        ) : (
          <>
            {/* Success header */}
            <div className="text-center">
              <p className="text-4xl mb-2">{MOODS[selected - 1].emoji}</p>
              <p className="pixel-font text-[11px] text-gray-800 mb-1">
                Feeling {MOODS[selected - 1].label}!
              </p>
              <p className="text-xs text-gray-500">
                Stack +1 earned! Total stacks:{' '}
                <span className="font-bold text-pink-500">{totalStacks}</span>
              </p>
            </div>

            {/* Heatmap */}
            <div className="bg-[#161b22] rounded-2xl p-4">
              <p className="pixel-font text-[8px] text-[#636e7b] mb-3">Mood Log — Past Year</p>
              <MoodHeatmap feelingNotes={feelingNotes} />
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-gray-900 text-white py-3 pixel-font text-[10px] active:scale-95 transition-transform"
            >
              Let's go! 🚀
            </button>
          </>
        )}
      </div>
    </div>
  )
}
