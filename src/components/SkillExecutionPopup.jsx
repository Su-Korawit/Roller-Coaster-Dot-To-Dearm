import { useState, useEffect, useRef } from 'react'
import { useTaskStore } from '../stores/useTaskStore'
import { useUserStore } from '../stores/useUserStore'

// ─────────────────────────────────────────────────────────────────────────────
// Ignite Popup — 5-second launch countdown, then "GO!" for the specific task
// ─────────────────────────────────────────────────────────────────────────────
function IgnitePopup({ task, onDone, onCancel }) {
  const [count, setCount] = useState(5)

  useEffect(() => {
    if (count === 0) { onDone(); return }
    const t = setTimeout(() => setCount((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [count, onDone])

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8">
      <p className="pixel-font text-[9px] text-orange-500 tracking-widest">🚀 IGNITE</p>
      <p className="pixel-font text-[9px] text-gray-500 text-center px-4">{task.title}</p>
      <p className="pixel-font text-[96px] leading-none text-orange-400">{count}</p>
      <p className="pixel-font text-[8px] text-gray-400">Get ready to start your task!</p>
      <button
        onClick={onCancel}
        className="pixel-font text-[8px] text-gray-400 border border-gray-300 rounded-full px-4 py-2 active:scale-95 transition-transform"
      >
        Cancel
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Capsule Popup — 30-minute countdown timer, +50% coins on completion
// ─────────────────────────────────────────────────────────────────────────────
const CAPSULE_MS = 30 * 60 * 1000 // 30 min

function CapsulePopup({ task, timerEnd, onComplete, onCancel }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (timerEnd ?? Date.now() + CAPSULE_MS) - Date.now()))

  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [remaining])

  const totalMs = CAPSULE_MS
  const progress = Math.max(0, Math.min(1, 1 - remaining / totalMs))
  const mins = String(Math.floor(remaining / 60000)).padStart(2, '0')
  const secs = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')
  const expired = remaining <= 0

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-8 px-6">
      <p className="pixel-font text-[9px] text-sky-500 tracking-widest">⏳ CAPSULE</p>
      <p className="pixel-font text-[9px] text-gray-500 text-center">{task.title}</p>

      {/* Circular-style progress ring (SVG) */}
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke={expired ? '#4ade80' : '#38bdf8'}
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {expired
            ? <span className="text-2xl">✅</span>
            : <p className="pixel-font text-[16px] text-gray-800">{mins}:{secs}</p>
          }
        </div>
      </div>

      {expired ? (
        <>
          <p className="pixel-font text-[9px] text-green-500">Time's up! +50% bonus coins!</p>
          <button
            onClick={onComplete}
            className="w-full rounded-xl bg-green-500 text-white py-3 pixel-font text-[10px] active:scale-95 transition-transform"
          >
            Complete Task 🎉
          </button>
        </>
      ) : (
        <>
          <p className="pixel-font text-[8px] text-gray-400 text-center">
            Complete within time for +50% coins
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onComplete}
              className="flex-1 rounded-xl bg-sky-500 text-white py-2.5 pixel-font text-[9px] active:scale-95 transition-transform"
            >
              Done Early! 💰
            </button>
            <button
              onClick={onCancel}
              className="px-4 border border-gray-200 rounded-xl text-xs text-gray-400 active:scale-95 transition-transform"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root popup — dispatches to the right skill UI
// Props:
//   task        – full task object
//   onClose()   – dismiss popup (no action)
// ─────────────────────────────────────────────────────────────────────────────
export default function SkillExecutionPopup({ task, onClose }) {
  const { clearSkillFromTask, toggleTask } = useTaskStore()
  const { addCoins } = useUserStore()

  function handleIgniteDone() {
    // Countdown finished — clear skill slot and close; user can now start the task
    clearSkillFromTask(task.id)
    onClose()
  }

  function handleCapsuleComplete() {
    const inTime = task.timerEnd ? Date.now() <= task.timerEnd : false
    const baseCoins = task.rewardCoins || 10
    const bonus = inTime ? Math.round(baseCoins * 0.5) : 0
    addCoins(baseCoins + bonus)
    toggleTask(task.id)
    clearSkillFromTask(task.id)
    onClose()
  }

  function handleCancel() {
    clearSkillFromTask(task.id)
    onClose()
  }

  return (
    <div className="absolute inset-0 z-80 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={handleCancel} />

      {/* Sheet */}
      <div className="relative mt-auto bg-white rounded-t-3xl shadow-2xl overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {task.assignedSkill === 'ignite' && (
          <IgnitePopup task={task} onDone={handleIgniteDone} onCancel={handleCancel} />
        )}
        {task.assignedSkill === 'capsule' && (
          <CapsulePopup
            task={task}
            timerEnd={task.timerEnd}
            onComplete={handleCapsuleComplete}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  )
}
