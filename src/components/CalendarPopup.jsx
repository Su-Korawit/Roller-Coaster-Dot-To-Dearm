import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, Plus, Check, Trash2, Calendar } from 'lucide-react'
import { useTaskStore } from '../stores/useTaskStore'
import TaskForm from './TaskForm'
import Popup from './ui/Popup'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPopup({ onClose }) {
  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [showForm, setShowForm] = useState(false)

  const tasks = useTaskStore((s) => s.tasks)
  const addTask = useTaskStore((s) => s.addTask)
  const toggleTask = useTaskStore((s) => s.toggleTask)
  const removeTask = useTaskStore((s) => s.removeTask)

  // Calendar grid cells — computed from current view state
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth)
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function tasksForDate(dateStr) {
    return tasks.filter((t) => t.scheduledDate === dateStr)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  function handleDayClick(dateStr) {
    setSelectedDate(dateStr)
    setShowForm(false)
  }

  // Parse selected date for display
  const [selYear, selMonthNum, selDay] = selectedDate.split('-').map(Number)
  const selectedTasks = tasksForDate(selectedDate)
  const completedSelected = selectedTasks.filter((t) => t.completed).length

  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      {/* Header: month navigation */}
      <div className="flex items-center gap-1 px-4 py-2 shrink-0">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-soft active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} className="text-ink-soft" />
        </button>

        <h2 className="flex-1 text-center pixel-font text-[12px] font-bold text-ink flex items-center justify-center gap-1.5">
          <Calendar size={14} strokeWidth={2.5} aria-hidden="true" />
          {MONTHS[viewMonth]} {viewYear}
        </h2>

        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-soft active:scale-95 transition-transform"
        >
          <ChevronRight size={18} className="text-ink-soft" />
        </button>

        <button
          onClick={onClose}
          aria-label="ปิด"
          className="px-btn w-9 h-9 flex items-center justify-center rounded-lg bg-paper text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ml-1"
        >
          <X size={16} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 px-3 pb-8">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={`text-center pixel-font text-xs py-1
                ${i === 0 ? 'text-danger' : i === 6 ? 'text-brand' : 'text-ink-soft'}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="min-h-11.5" />

            const dateStr = toDateStr(viewYear, viewMonth, day)
            const dayTasks = tasksForDate(dateStr)
            const doneCnt = dayTasks.filter((t) => t.completed).length
            const totalCnt = dayTasks.length
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const dow = (firstDow + day - 1) % 7

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(dateStr)}
                className={`relative flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl min-h-11.5 transition-all active:scale-95
                  ${isSelected ? 'bg-brand-soft ring-2 ring-brand' : 'hover:bg-paper'}
                  ${isToday && !isSelected ? 'bg-warn/10 ring-1 ring-warn' : ''}`}
              >
                <span
                  className={`pixel-font text-xs leading-none
                    ${isSelected ? 'text-brand-strong font-bold'
                      : isToday ? 'text-warn font-bold'
                      : dow === 0 ? 'text-danger'
                      : dow === 6 ? 'text-brand'
                      : 'text-ink'}`}
                >
                  {day}
                </span>

                {/* Task indicator dots */}
                {totalCnt > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                    {Array.from({ length: Math.min(totalCnt, 3) }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full
                          ${i < doneCnt ? 'bg-good' : 'bg-brand'}`}
                      />
                    ))}
                    {totalCnt > 3 && (
                      <span className="pixel-font text-xs text-ink-soft leading-none mt-px">
                        +{totalCnt - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Selected Day Panel ── */}
        <div className="mt-4 rounded-2xl bg-paper border border-ink/10 overflow-hidden">
          {/* Day header row */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10 bg-white">
            <div>
              <p className="pixel-font text-xs font-bold text-ink">
                {MONTHS[selMonthNum - 1]} {selDay}, {selYear}
                {selectedDate === todayStr && (
                  <span className="ml-2 pixel-font text-xs text-warn">• Today</span>
                )}
              </p>
              <p className="pixel-font text-xs text-ink-soft mt-0.5">
                {selectedTasks.length === 0
                  ? 'No tasks scheduled'
                  : `${completedSelected} / ${selectedTasks.length} completed`}
              </p>
            </div>
            <button
            onClick={() => setShowForm((v) => !v)}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow active:scale-95 transition-all
              ${showForm ? 'bg-brand-soft/60 text-ink-soft rotate-45' : 'bg-brand-soft0 text-white'}`}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add task form */}
          {showForm && (
            <div className="border-b border-ink/10">
              <TaskForm
                defaultDate={selectedDate}
                onSave={(payload) => { addTask(payload); setShowForm(false) }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {/* Tasks list */}
          {selectedTasks.length === 0 && !showForm ? (
            <div className="px-4 py-6 text-center">
              <p className="text-2xl mb-2">🗓️</p>
              <p className="pixel-font text-xs text-ink-soft">No tasks for this day</p>
              <p className="pixel-font text-xs text-ink-soft/50 mt-1">Tap + to schedule one</p>
            </div>
          ) : (
            <div>
              {selectedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-ink/10 last:border-b-0
                    ${task.completed ? 'opacity-60 bg-good/10/40' : 'bg-white'}`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors active:scale-90
                      ${task.completed
                        ? 'border-good bg-good text-ink'
                        : 'border-ink/30 hover:border-brand'}`}
                  >
                    {task.completed && <Check size={12} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`pixel-font text-xs truncate
                        ${task.completed ? 'line-through text-ink-soft' : 'text-ink'}`}
                    >
                      {task.title}
                    </p>
                    <p className="pixel-font text-xs text-ink-soft mt-0.5">
                      {task.type} · {task.timeMinutes} min
                    </p>
                  </div>

                  <button
                    onClick={() => removeTask(task.id)}
                    className="text-ink-soft/50 hover:text-danger p-1 transition-colors active:scale-90"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Popup>
  )
}
