import { useState } from 'react'
import { useSelectStore } from '../stores/useSelectStore'

// MBTI-specific task type suggestion chips.
// Derived from the project's MBTI/Career mapping in onboardingData.js.
const MBTI_SUGGESTIONS = {
  INTJ: ['Study', 'Project', 'Strategy'],
  INTP: ['Study', 'Research', 'Project'],
  ENTJ: ['Work', 'Project', 'Strategy'],
  ENTP: ['Research', 'Creative', 'Project'],
  INFJ: ['Personal', 'Learning', 'Creative'],
  INFP: ['Creative', 'Personal', 'Learning'],
  ENFJ: ['Work', 'Personal', 'Learning'],
  ENFP: ['Creative', 'Personal', 'Exercise'],
  ISTJ: ['Work', 'General', 'Study'],
  ISFJ: ['Work', 'Personal', 'General'],
  ESTJ: ['Work', 'General', 'Project'],
  ESFJ: ['Personal', 'Work', 'General'],
  ISTP: ['Project', 'Exercise', 'General'],
  ISFP: ['Creative', 'Exercise', 'Personal'],
  ESTP: ['Exercise', 'Project', 'Work'],
  ESFP: ['Personal', 'Exercise', 'Creative'],
}

const BLANK = {
  title: '',
  type: 'General',
  timeMinutes: 45,
  deadline: '',
  description: '',
  scheduledDate: null,
}

/**
 * Reusable Task creation / edit form.
 * Single source of truth for all task mutations — consumed by both
 * TaskPanel (general list) and CalendarPopup (planner).
 *
 * Props:
 *   initialValues  – prefill fields when editing an existing task
 *   defaultDate    – 'YYYY-MM-DD'; auto-sets scheduledDate when opened from Calendar
 *   onSave(payload)– called with the complete, validated task payload
 *   onCancel       – called when user dismisses without saving (optional)
 */
export default function TaskForm({ initialValues = {}, defaultDate = null, onSave, onCancel }) {
  const { mbti } = useSelectStore()
  const suggestions = MBTI_SUGGESTIONS[mbti] ?? []

  const [form, setForm] = useState({ ...BLANK, ...initialValues })

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    const title = form.title.trim()
    if (!title) return
    onSave({
      title,
      type: form.type || 'General',
      timeMinutes: Number(form.timeMinutes) || 45,
      rewardCoins: 10,
      deadline: form.deadline || '',
      description: form.description.trim(),
      // defaultDate (Calendar context) takes precedence; fall back to any existing scheduledDate
      scheduledDate: defaultDate ?? form.scheduledDate ?? null,
    })
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5">
      {/* ── Scheduled-date banner (Calendar context only) ── */}
      {defaultDate && (
        <div className="mb-4 flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5">
          <span className="text-base">📅</span>
          <span className="pixel-font text-[9px] text-purple-700">
            Scheduling for <span className="font-bold">{defaultDate}</span>
          </span>
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <label className="block">
          <span className="pixel-font text-[9px] text-gray-600">Task Name</span>
          <input
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="#1 | Hackathon"
            autoFocus
            className="mt-2 w-full rounded-xl border border-gray-200 shadow-sm px-4 py-3 outline-none focus:border-purple-400"
          />
        </label>

        {/* Type + MBTI suggestion chips */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="pixel-font text-[9px] text-gray-600">Type</span>
            {mbti && (
              <span className="pixel-font text-[7px] text-purple-400 bg-purple-50 rounded-full px-2 py-0.5">
                ✨ {mbti} picks
              </span>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update('type', s)}
                  className={`px-3 py-1 rounded-full pixel-font text-[8px] border transition-colors active:scale-95
                    ${form.type === s
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <input
            value={form.type}
            onChange={(e) => update('type', e.target.value)}
            placeholder="Competition / Study / Project"
            className="w-full rounded-xl border border-gray-200 shadow-sm px-4 py-3 outline-none focus:border-purple-400"
          />
        </div>

        {/* Time + Deadline */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="pixel-font text-[9px] text-gray-600">Time (min)</span>
            <input
              type="number"
              min="5"
              step="5"
              value={form.timeMinutes}
              onChange={(e) => update('timeMinutes', e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 shadow-sm px-4 py-3 outline-none focus:border-purple-400"
            />
          </label>

          <label className="block">
            <span className="pixel-font text-[9px] text-gray-600">Deadline</span>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => update('deadline', e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 shadow-sm px-4 py-3 outline-none focus:border-purple-400"
            />
          </label>
        </div>

        {/* Description */}
        <label className="block">
          <span className="pixel-font text-[9px] text-gray-600">Detail</span>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Additional detail..."
            className="mt-2 w-full rounded-xl border border-gray-200 shadow-sm px-4 py-3 outline-none focus:border-purple-400 resize-none"
          />
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!form.title.trim()}
        className="mt-6 w-full rounded-xl border border-gray-300 shadow-sm bg-white py-3 pixel-font text-[10px] text-gray-800 disabled:opacity-40 active:scale-95 transition-transform"
      >
        Save Task
      </button>

      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-2 w-full py-2 pixel-font text-[9px] text-gray-400"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
