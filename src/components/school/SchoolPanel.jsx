import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Plus, BookOpen, ClipboardCheck } from 'lucide-react'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useUserStore } from '../../stores/useUserStore'
import { appointmentsDueOn, isOverdue } from '../../utils/schoolDayView'

export const HOMEWORK_REWARD_COINS = 5

function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function SchoolPanel({ onClose, onOpenSubject, initialDate, today }) {
  const subjects = useSchoolStore((s) => s.subjects)
  const appointments = useSchoolStore((s) => s.appointments)
  const toggleAppointment = useSchoolStore((s) => s.toggleAppointment)
  const addSubject = useSchoolStore((s) => s.addSubject)
  const addCoins = useUserStore((s) => s.addCoins)

  const [date, setDate] = useState(
    initialDate ?? new Date().toISOString().slice(0, 10),
  )
  // "today" is fixed for the panel's lifetime (when it opened), independent of
  // `date` (which changes as the student browses other days) — an appointment
  // is only ever overdue relative to the real today, not the day being viewed.
  const todayStr = today ?? initialDate ?? new Date().toISOString().slice(0, 10)

  const dayItems = appointmentsDueOn(appointments, date)

  function handleToggle(appt) {
    if (!appt.completed) addCoins(HOMEWORK_REWARD_COINS)
    toggleAppointment(appt.id)
  }

  function handleAddSubject() {
    const name = window.prompt('ชื่อวิชา')
    if (name && name.trim()) addSubject({ name: name.trim() })
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden md:max-w-2xl md:mx-auto lg:max-w-3xl"
      style={{ top: '10%' }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-ink rounded-full" />
      </div>

      <div className="px-4 pb-4 flex-1 min-h-0">
        <div className="rounded-xl bg-white border border-ink/10 overflow-hidden h-[82vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10">
            <div className="flex items-center gap-2">
              <button onClick={() => setDate((d) => shiftDate(d, -1))} aria-label="วันก่อนหน้า" className="text-ink-soft hover:text-ink p-1">
                <ChevronLeft size={18} />
              </button>
              <h2 className="thai-font text-sm text-ink">{formatDateLabel(date)}</h2>
              <button onClick={() => setDate((d) => shiftDate(d, 1))} aria-label="วันถัดไป" className="text-ink-soft hover:text-ink p-1">
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              onClick={onClose}
              aria-label="ปิด"
              className="neo-btn w-9 h-9 flex items-center justify-center rounded-lg bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X size={16} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Subject rail */}
            <div className="w-24 shrink-0 border-r border-ink/10 overflow-y-auto py-3 flex flex-col items-center gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => onOpenSubject(subject.id)}
                  className="w-full flex flex-col items-center gap-1 py-2 hover:bg-brand-soft transition-colors"
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: subject.color }}
                    aria-hidden="true"
                  >
                    {subject.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="thai-font text-[10px] text-ink truncate max-w-full px-1">{subject.name}</span>
                </button>
              ))}
              <button
                onClick={handleAddSubject}
                aria-label="เพิ่มวิชา"
                className="mt-1 w-8 h-8 rounded-full border-2 border-dashed border-brand/40 text-brand flex items-center justify-center"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Day view */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {dayItems.length === 0 ? (
                <p className="thai-font text-center text-sm text-ink-soft py-10">ไม่มีงานสำหรับวันนี้</p>
              ) : (
                dayItems.map((appt) => {
                  const overdue = isOverdue(appt, todayStr)
                  return (
                    <label
                      key={appt.id}
                      data-testid="school-appointment-item"
                      className={`neo-card flex items-center gap-3 p-3 ${appt.completed ? 'opacity-50' : ''} ${overdue ? 'school-overdue border-danger' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={appt.completed}
                        onChange={() => handleToggle(appt)}
                      />
                      {appt.kind === 'checkpoint'
                        ? <ClipboardCheck size={16} className={overdue ? 'text-danger shrink-0' : 'text-brand-strong shrink-0'} aria-hidden="true" />
                        : <BookOpen size={16} className={overdue ? 'text-danger shrink-0' : 'text-brand-strong shrink-0'} aria-hidden="true" />}
                      <span className="flex-1 min-w-0">
                        <span className={`thai-font text-sm block truncate ${appt.completed ? 'line-through text-ink-soft' : overdue ? 'text-danger' : 'text-ink'}`}>
                          {appt.title}
                        </span>
                        {overdue && <span className="thai-font text-[10px] text-danger block">เลยกำหนดส่ง</span>}
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
