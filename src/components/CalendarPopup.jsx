import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, Plus, Check, Trash2 } from 'lucide-react'
import { useTaskStore } from '../stores/useTaskStore'
import TaskForm from './TaskForm'

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

  const { tasks, addTask, toggleTask, removeTask } = useTaskStore()

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
    <div className="absolute inset-0 z-70 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="relative mt-auto bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header: month navigation */}
        <div className="flex items-center gap-1 px-4 py-2 shrink-0">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-transform"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>

          <h2 className="flex-1 text-center pixel-font text-[12px] font-bold text-gray-800">
            📅 {MONTHS[viewMonth]} {viewYear}
          </h2>

          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-transform"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 ml-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-3 pb-8">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d, i) => (
              <div
                key={d}
                className={`text-center pixel-font text-[8px] py-1
                  ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}
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
                    ${isSelected ? 'bg-purple-100 ring-2 ring-purple-400' : 'hover:bg-gray-50'}
                    ${isToday && !isSelected ? 'bg-orange-50 ring-1 ring-orange-300' : ''}`}
                >
                  <span
                    className={`pixel-font text-[10px] leading-none
                      ${isSelected ? 'text-purple-700 font-bold'
                        : isToday ? 'text-orange-500 font-bold'
                        : dow === 0 ? 'text-red-400'
                        : dow === 6 ? 'text-blue-400'
                        : 'text-gray-700'}`}
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
                            ${i < doneCnt ? 'bg-green-400' : 'bg-purple-400'}`}
                        />
                      ))}
                      {totalCnt > 3 && (
                        <span className="pixel-font text-[6px] text-gray-400 leading-none mt-px">
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
          <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden">
            {/* Day header row */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
              <div>
                <p className="pixel-font text-[11px] font-bold text-gray-800">
                  {MONTHS[selMonthNum - 1]} {selDay}, {selYear}
                  {selectedDate === todayStr && (
                    <span className="ml-2 pixel-font text-[9px] text-orange-400">• Today</span>
                  )}
                </p>
                <p className="pixel-font text-[8px] text-gray-400 mt-0.5">
                  {selectedTasks.length === 0
                    ? 'No tasks scheduled'
                    : `${completedSelected} / ${selectedTasks.length} completed`}
                </p>
              </div>
              <button
              onClick={() => setShowForm((v) => !v)}
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow active:scale-95 transition-all
                ${showForm ? 'bg-gray-200 text-gray-600 rotate-45' : 'bg-purple-500 text-white'}`}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Add task form */}
            {showForm && (
              <div className="border-b border-gray-200">
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
                <p className="pixel-font text-[9px] text-gray-400">No tasks for this day</p>
                <p className="pixel-font text-[8px] text-gray-300 mt-1">Tap + to schedule one</p>
              </div>
            ) : (
              <div>
                {selectedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0
                      ${task.completed ? 'opacity-60 bg-green-50/40' : 'bg-white'}`}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors active:scale-90
                        ${task.completed
                          ? 'border-green-400 bg-green-400 text-white'
                          : 'border-gray-300 hover:border-purple-400'}`}
                    >
                      {task.completed && <Check size={12} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`pixel-font text-[9px] truncate
                          ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
                      >
                        {task.title}
                      </p>
                      <p className="pixel-font text-[7px] text-gray-400 mt-0.5">
                        {task.type} · {task.timeMinutes} min
                      </p>
                    </div>

                    <button
                      onClick={() => removeTask(task.id)}
                      className="text-gray-300 hover:text-red-400 p-1 transition-colors active:scale-90"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
