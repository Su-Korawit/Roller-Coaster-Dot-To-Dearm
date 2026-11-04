import { useEffect, useState } from 'react'
import { Plus, Trash2, CalendarDays, ExternalLink, Check } from 'lucide-react'
import { useTcasEventsStore } from '../stores/useTcasEventsStore'
import { eventsWithFallback } from '../data/tcas70'
import { useSchoolStore } from '../stores/useSchoolStore'
import { useAuthStore } from '../stores/useAuthStore'
import { ADMIN_UID } from '../constants/admin'
import { splitTcasEvents } from '../utils/tcasCalendar'

function EventRow({ event, passed, expanded, onToggle, onAdd, added, isAdmin, onDelete }) {
  return (
    <li className={`px-card p-3 ${passed ? 'opacity-60' : ''}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 text-left">
        <span
          className={`w-3 h-3 rounded-full border-2 border-ink shrink-0 ${passed ? 'bg-green-400' : 'bg-accent-pink'}`}
          aria-hidden="true"
        />
        <span className="flex-1 min-w-0">
          <span className="thai-font text-sm text-ink block truncate">{event.title}</span>
          <span className="pixel-font text-xs text-ink-soft">{event.date}</span>
        </span>
        {isAdmin && (
          <span
            role="button"
            aria-label="ลบกิจกรรม"
            onClick={(e) => { e.stopPropagation(); onDelete(event.id) }}
            className="text-ink-soft hover:text-danger p-1"
          >
            <Trash2 size={14} />
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-2 pl-6 space-y-2">
          <p className="thai-font text-sm text-ink-soft whitespace-pre-line">{event.description}</p>
          {event.link && (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="thai-font text-xs text-brand-strong inline-flex items-center gap-1"
            >
              <ExternalLink size={12} /> เปิดลิงก์
            </a>
          )}
          <button
            onClick={onAdd}
            disabled={added}
            className={`px-btn rounded-lg px-3 py-1.5 pixel-font text-xs flex items-center gap-1.5 ${
              added ? 'bg-brand-soft text-ink-soft' : 'bg-brand-strong text-white'
            }`}
          >
            {added ? (<><Check size={12} /> เพิ่มลงตารางแล้ว</>) : (<><CalendarDays size={12} /> Add to Calendar</>)}
          </button>
        </div>
      )}
    </li>
  )
}

export default function TcasCalendarTab({ today, onGuestAction }) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.uid === ADMIN_UID
  const storedEvents = useTcasEventsStore((s) => s.events)
  const events = eventsWithFallback(storedEvents)
  const addEvent = useTcasEventsStore((s) => s.addEvent)
  const deleteEvent = useTcasEventsStore((s) => s.deleteEvent)
  const addAppointment = useSchoolStore((s) => s.addAppointment)

  const [expandedId, setExpandedId] = useState(null)
  const [addedIds, setAddedIds] = useState(() => new Set())
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')
  const [round, setRound] = useState('')
  const [kind, setKind] = useState('')
  const [examKeys, setExamKeys] = useState('')

  useEffect(() => {
    const unsub = useTcasEventsStore.getState().subscribeEvents()
    return () => unsub?.()
  }, [])

  const todayStr = today ?? new Date().toISOString().slice(0, 10)
  const { passed, upcoming } = splitTcasEvents(events, todayStr)

  function handleAddToCalendar(event) {
    if (!user) {
      onGuestAction?.()
      return
    }
    addAppointment(null, { title: event.title, kind: 'tcas', dueDate: event.date })
    setAddedIds((prev) => new Set(prev).add(event.id))
  }

  async function handleSaveEvent() {
    if (!title.trim() || !date) return
    await addEvent({ title, description, date, link, round, kind, examKeys })
    setTitle(''); setDate(''); setDescription(''); setLink(''); setRound(''); setKind(''); setExamKeys(''); setShowForm(false)
  }

  const renderRow = (event, isPassed) => (
    <EventRow
      key={event.id}
      event={event}
      passed={isPassed}
      expanded={expandedId === event.id}
      onToggle={() => setExpandedId((prev) => (prev === event.id ? null : event.id))}
      onAdd={() => handleAddToCalendar(event)}
      added={addedIds.has(event.id)}
      isAdmin={isAdmin && !event.builtIn}
      onDelete={deleteEvent}
    />
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="pixel-font text-xs text-ink">TCAS70 Calendar</h3>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            aria-label="เพิ่มกิจกรรม TCAS"
            className="px-btn w-8 h-8 rounded-lg bg-brand-soft flex items-center justify-center text-brand-strong"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {showForm && (
        <div className="px-card p-3 space-y-2">
          <label className="flex flex-col thai-font text-xs text-ink-soft">
            ชื่อกิจกรรม
            <input aria-label="ชื่อกิจกรรม" value={title} onChange={(e) => setTitle(e.target.value)} className="px-input px-2 py-1 text-sm" />
          </label>
          <label className="flex flex-col thai-font text-xs text-ink-soft">
            วันที่
            <input aria-label="วันที่" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-input px-2 py-1 text-sm" />
          </label>
          <label className="flex flex-col thai-font text-xs text-ink-soft">
            รายละเอียด
            <textarea aria-label="รายละเอียด" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="px-input px-2 py-1 text-sm resize-none" />
          </label>
          <label className="flex flex-col thai-font text-xs text-ink-soft">
            ลิงก์ (ไม่บังคับ)
            <input aria-label="ลิงก์" value={link} onChange={(e) => setLink(e.target.value)} className="px-input px-2 py-1 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col thai-font text-xs text-ink-soft">
              รอบ (ไม่บังคับ)
              <select aria-label="รอบ" value={round} onChange={(e) => setRound(e.target.value)} className="px-input px-2 py-1 text-sm">
                <option value="">ไม่ระบุ</option>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{`รอบ ${n}`}</option>)}
              </select>
            </label>
            <label className="flex flex-col thai-font text-xs text-ink-soft">
              ประเภท (ไม่บังคับ)
              <select aria-label="ประเภท" value={kind} onChange={(e) => setKind(e.target.value)} className="px-input px-2 py-1 text-sm">
                <option value="">ไม่ระบุ</option>
                <option value="apply">เปิดรับสมัคร</option>
                <option value="exam">สอบ</option>
                <option value="announce">ประกาศผล</option>
                <option value="other">อื่น ๆ</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col thai-font text-xs text-ink-soft">
            รหัสวิชาที่สอบ (คั่นด้วย , เช่น a_lv_64, tgat)
            <input aria-label="รหัสวิชาที่สอบ" value={examKeys} onChange={(e) => setExamKeys(e.target.value)} className="px-input px-2 py-1 text-sm" />
          </label>
          <button onClick={handleSaveEvent} className="px-btn w-full rounded-lg bg-brand-strong py-2 pixel-font text-xs text-white">
            บันทึกกิจกรรม
          </button>
        </div>
      )}

      {passed.length > 0 && (
        <>
          <p className="pixel-font text-xs text-ink-soft">ผ่านไปแล้ว</p>
          <ul data-testid="tcas-passed" className="space-y-2">
            {passed.map((e) => renderRow(e, true))}
          </ul>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <p className="pixel-font text-xs text-ink-soft pt-2">กำลังจะมาถึง</p>
          <ul data-testid="tcas-upcoming" className="space-y-2">
            {upcoming.map((e) => renderRow(e, false))}
          </ul>
        </>
      )}

      {events.length === 0 && (
        <p className="thai-font text-center text-sm text-ink-soft py-10">ยังไม่มีกิจกรรมในปฏิทิน</p>
      )}
    </div>
  )
}
