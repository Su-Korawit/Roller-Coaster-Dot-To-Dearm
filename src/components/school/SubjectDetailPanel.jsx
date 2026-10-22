import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { DAY_KEYS, noteFor, notesForSubject } from '../../utils/schoolDayView'

const DAY_LABELS = { sun: 'sun', mon: 'mon', tue: 'tue', wed: 'wed', thu: 'thu', fri: 'fri', sat: 'sat' }

export default function SubjectDetailPanel({ subjectId, onClose, today }) {
  const todayStr = today ?? new Date().toISOString().slice(0, 10)
  // Select raw store arrays and derive per-subject views during render.
  // Filtering inside the selector returns a fresh array on every store read,
  // which useSyncExternalStore treats as an ever-changing snapshot → infinite
  // re-render loop (same class of bug as the news store fix in 115101b).
  const allSubjects = useSchoolStore((s) => s.subjects)
  const allScheduleSlots = useSchoolStore((s) => s.scheduleSlots)
  const allAppointments = useSchoolStore((s) => s.appointments)
  const subject = allSubjects.find((sub) => sub.id === subjectId)
  const scheduleSlots = allScheduleSlots.filter((sl) => sl.subjectId === subjectId)
  const appointments = allAppointments.filter((a) => a.subjectId === subjectId)
  const addScheduleSlot = useSchoolStore((s) => s.addScheduleSlot)
  const removeScheduleSlot = useSchoolStore((s) => s.removeScheduleSlot)
  const addAppointment = useSchoolStore((s) => s.addAppointment)
  const removeAppointment = useSchoolStore((s) => s.removeAppointment)
  const toggleAppointment = useSchoolStore((s) => s.toggleAppointment)
  const updateSubject = useSchoolStore((s) => s.updateSubject)
  const removeSubject = useSchoolStore((s) => s.removeSubject)
  const notes = useSchoolStore((s) => s.notes)
  const upsertNote = useSchoolStore((s) => s.upsertNote)

  const [nameDraft, setNameDraft] = useState(subject?.name ?? '')

  const [slotDay, setSlotDay] = useState('mon')
  const [slotStart, setSlotStart] = useState('12:00')
  const [slotEnd, setSlotEnd] = useState('13:00')

  const [apptTitle, setApptTitle] = useState('')
  const [apptKind, setApptKind] = useState('homework')
  const [apptDue, setApptDue] = useState('')

  if (!subject) return null

  function handleRenameBlur() {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== subject.name) updateSubject(subjectId, { name: trimmed })
  }

  function handleDeleteSubject() {
    removeSubject(subjectId)
    onClose()
  }

  function handleAddSlot() {
    addScheduleSlot(subjectId, { day: slotDay, startTime: slotStart, endTime: slotEnd })
  }

  function handleAddAppointment() {
    if (!apptTitle.trim() || !apptDue) return
    addAppointment(subjectId, { title: apptTitle.trim(), kind: apptKind, dueDate: apptDue })
    setApptTitle('')
    setApptDue('')
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
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-ink/10">
            <input
              aria-label="ชื่อวิชา"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={handleRenameBlur}
              className="thai-font text-sm text-ink bg-transparent border-b-2 border-transparent focus:border-brand outline-none flex-1 min-w-0"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleDeleteSubject} aria-label="ลบวิชา" className="text-ink-soft hover:text-danger p-2">
                <Trash2 size={16} />
              </button>
              <button
                onClick={onClose}
                aria-label="ปิด"
                className="px-btn w-9 h-9 flex items-center justify-center rounded-lg bg-paper text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X size={16} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Schedule */}
            <section>
              <h3 className="pixel-font text-xs text-ink-soft mb-2">Schedule</h3>
              <ul className="space-y-1 mb-3">
                {scheduleSlots.map((slot) => (
                  <li key={slot.id} className="px-card flex items-center justify-between p-2">
                    <span className="thai-font text-sm text-ink">
                      {DAY_LABELS[slot.day]}. {slot.startTime} - {slot.endTime}
                    </span>
                    <button onClick={() => removeScheduleSlot(slot.id)} aria-label="ลบคาบเรียน" className="text-ink-soft hover:text-danger p-1">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 items-end flex-wrap">
                <label className="flex flex-col text-xs thai-font text-ink-soft">
                  วัน
                  <select
                    aria-label="วัน"
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    className="px-input px-2 py-1 text-sm"
                  >
                    {DAY_KEYS.map((day) => (
                      <option key={day} value={day}>{DAY_LABELS[day]}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs thai-font text-ink-soft">
                  เวลาเริ่ม
                  <input aria-label="เวลาเริ่ม" type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="px-input px-2 py-1 text-sm" />
                </label>
                <label className="flex flex-col text-xs thai-font text-ink-soft">
                  เวลาสิ้นสุด
                  <input aria-label="เวลาสิ้นสุด" type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="px-input px-2 py-1 text-sm" />
                </label>
                <button onClick={handleAddSlot} className="px-btn rounded-lg bg-brand-soft px-3 py-1.5 text-sm thai-font text-ink">
                  เพิ่มคาบเรียน
                </button>
              </div>
            </section>

            {/* Appointments */}
            <section>
              <h3 className="pixel-font text-xs text-ink-soft mb-2">Appointment</h3>
              <ul className="space-y-1 mb-3">
                {appointments.map((appt) => (
                  <li key={appt.id} className="px-card flex items-center gap-2 p-2">
                    <input type="checkbox" checked={appt.completed} onChange={() => toggleAppointment(appt.id)} />
                    <span className={`flex-1 thai-font text-sm text-ink ${appt.completed ? 'line-through text-ink-soft' : ''}`}>
                      <span>{appt.title}</span> · {appt.dueDate}
                    </span>
                    <button onClick={() => removeAppointment(appt.id)} aria-label="ลบงาน" className="text-ink-soft hover:text-danger p-1">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 items-end flex-wrap">
                <label className="flex flex-col text-xs thai-font text-ink-soft flex-1 min-w-32">
                  หัวข้องาน
                  <input
                    aria-label="หัวข้องาน"
                    value={apptTitle}
                    onChange={(e) => setApptTitle(e.target.value)}
                    className="px-input px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex flex-col text-xs thai-font text-ink-soft">
                  ประเภท
                  <select value={apptKind} onChange={(e) => setApptKind(e.target.value)} className="px-input px-2 py-1 text-sm">
                    <option value="homework">Homework</option>
                    <option value="checkpoint">Checkpoint</option>
                  </select>
                </label>
                <label className="flex flex-col text-xs thai-font text-ink-soft">
                  กำหนดส่ง
                  <input aria-label="กำหนดส่ง" type="date" value={apptDue} onChange={(e) => setApptDue(e.target.value)} className="px-input px-2 py-1 text-sm" />
                </label>
                <button onClick={handleAddAppointment} className="px-btn rounded-lg bg-brand-soft px-3 py-1.5 text-sm thai-font text-ink">
                  เพิ่มงาน
                </button>
              </div>
            </section>

            <section>
              <h3 className="pixel-font text-xs text-ink-soft mb-2">Notebook</h3>
              <textarea
                key={todayStr}
                aria-label="Notebook"
                defaultValue={noteFor(notes, todayStr, subjectId)?.text ?? ''}
                onBlur={(e) => upsertNote({ date: todayStr, subjectId, text: e.target.value })}
                rows={3}
                placeholder="จดสิ่งที่เรียนวันนี้..."
                className="w-full rounded-xl border border-ink/10 px-3 py-2 outline-none focus:border-brand resize-none text-sm thai-font mb-3"
              />
              <ul className="space-y-1">
                {notesForSubject(notes, subjectId)
                  .filter((n) => n.date !== todayStr)
                  .map((n) => (
                    <li key={n.id} className="px-card p-2">
                      <p className="thai-font text-xs text-ink-soft">{n.date}</p>
                      <p className="thai-font text-sm text-ink">{n.text}</p>
                    </li>
                  ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
