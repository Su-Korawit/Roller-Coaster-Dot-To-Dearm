import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Check, CalendarPlus, Plus, Trash2 } from 'lucide-react'
import { useTcasEventsStore } from '../../stores/useTcasEventsStore'
import { useLifeStore } from '../../stores/useLifeStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { eventsWithFallback, TCAS_LABEL } from '../../data/tcas70'
import { ADMIN_UID } from '../../constants/admin'
import { todayKey } from '../lifeLogic'
import { monthCells, groupByDate, upcomingEvents } from '../calendarLogic'

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const thaiDate = (key, opt) => new Date(`${key}T00:00:00`).toLocaleDateString('th-TH', opt)

function EventCard({ event, added, onAdd, isAdmin, onDelete }) {
  return (
    <li className="px-card p-3 bg-paper flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <span className="w-3 h-3 mt-1 rounded-full border-2 border-line bg-accent-pink shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="thai-font text-sm font-bold break-words">{event.title}</p>
          <p className="thai-font text-xs text-ink-soft">{thaiDate(event.date, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {isAdmin && (
          <button type="button" onClick={() => onDelete(event.id)} aria-label={`ลบ ${event.title}`} className="p-1 text-danger"><Trash2 size={14} /></button>
        )}
      </div>
      {event.description && <p className="thai-font text-sm text-ink-soft whitespace-pre-line">{event.description}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onAdd}
          disabled={added}
          className={`px-btn px-3 py-1.5 thai-font text-xs font-bold inline-flex items-center gap-1.5 ${added ? 'bg-brand-soft text-ink-soft' : 'bg-brand-strong text-white'}`}
        >
          {added ? <><Check size={12} /> เพิ่มใน Habit แล้ว</> : <><CalendarPlus size={12} /> เพิ่มลงแผนของฉัน</>}
        </button>
        {event.link && (
          <a href={event.link} target="_blank" rel="noopener noreferrer" className="thai-font text-xs text-brand-strong underline inline-flex items-center gap-1">
            <ExternalLink size={12} aria-hidden="true" /> เปิดลิงก์
          </a>
        )}
      </div>
    </li>
  )
}

const EMPTY_FORM = { title: '', date: '', description: '', link: '' }

function AdminForm({ onSave }) {
  const [f, setF] = useState(EMPTY_FORM)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const input = 'px-input px-2 py-1 text-sm w-full'
  return (
    <div className="px-card p-3 bg-paper space-y-2">
      <input aria-label="ชื่อกิจกรรม" placeholder="ชื่อกิจกรรม" value={f.title} onChange={set('title')} className={input} />
      <input aria-label="วันที่" type="date" value={f.date} onChange={set('date')} className={input} />
      <textarea aria-label="รายละเอียด" rows={2} placeholder="รายละเอียด" value={f.description} onChange={set('description')} className={`${input} resize-none`} />
      <input aria-label="ลิงก์" placeholder="ลิงก์ (ไม่บังคับ)" value={f.link} onChange={set('link')} className={input} />
      <button
        type="button"
        disabled={!f.title.trim() || !f.date}
        onClick={async () => { await onSave(f); setF(EMPTY_FORM) }}
        className="px-btn w-full py-2 thai-font text-xs font-bold bg-brand-strong text-white disabled:opacity-50"
      >
        บันทึกกิจกรรม
      </button>
    </div>
  )
}

// Calendar: the TCAS70 central dates plus the user's own Habit tasks on one month grid.
// Tap a day to see what is on it; add a TCAS date to your plan (it becomes a Habit task).
export default function CalendarApp() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.uid === ADMIN_UID
  const stored = useTcasEventsStore((s) => s.events)
  const addEvent = useTcasEventsStore((s) => s.addEvent)
  const deleteEvent = useTcasEventsStore((s) => s.deleteEvent)
  const tasks = useLifeStore((s) => s.tasks)
  const addTask = useLifeStore((s) => s.addTask)

  const today = todayKey()
  const [selected, setSelected] = useState(today)
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const unsub = useTcasEventsStore.getState().subscribeEvents()
    return () => unsub?.()
  }, [])

  const events = useMemo(() => eventsWithFallback(stored), [stored])
  const eventsByDay = useMemo(() => groupByDate(events), [events])
  const tasksByDay = useMemo(() => groupByDate(tasks), [tasks])
  const cells = useMemo(() => monthCells(cursor.y, cursor.m), [cursor])
  const upcoming = useMemo(() => upcomingEvents(events, today, 4), [events, today])
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  const dayEvents = eventsByDay[selected] ?? []
  const dayTasks = tasksByDay[selected] ?? []
  // An event counts as "added" once a Habit task with the same text sits on that date.
  const isAdded = (e) => (tasksByDay[e.date] ?? []).some((t) => t.text === e.title)

  function moveMonth(delta) {
    setCursor(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  }
  const renderEvent = (e) => (
    <EventCard
      key={e.id}
      event={e}
      added={isAdded(e)}
      onAdd={() => addTask(e.title, 'อื่นๆ', e.date)}
      isAdmin={isAdmin && !e.builtIn}
      onDelete={deleteEvent}
    />
  )

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <h3 className="thai-font font-bold text-base flex-1">ปฏิทิน {TCAS_LABEL}</h3>
        {isAdmin && (
          <button type="button" onClick={() => setShowForm((v) => !v)} aria-label="เพิ่มกิจกรรม TCAS" className="px-btn w-8 h-8 flex items-center justify-center bg-brand-soft text-brand-strong">
            <Plus size={16} />
          </button>
        )}
      </div>
      {showForm && <AdminForm onSave={async (f) => { await addEvent({ ...f, round: '', kind: '', examKeys: '' }); setShowForm(false) }} />}

      <section className="px-card p-3 bg-paper" aria-label="ปฏิทินรายเดือน">
        <div className="flex items-center justify-between mb-2">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="เดือนก่อน" className="w-8 h-8 flex items-center justify-center rounded-ui hover:bg-brand-soft"><ChevronLeft size={18} /></button>
          <p className="thai-font font-bold text-sm">{monthLabel}</p>
          <button type="button" onClick={() => moveMonth(1)} aria-label="เดือนถัดไป" className="w-8 h-8 flex items-center justify-center rounded-ui hover:bg-brand-soft"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => <span key={w} className="thai-font text-xs text-ink-soft py-1">{w}</span>)}
          {cells.map((key, i) => {
            if (!key) return <span key={`b${i}`} />
            const dayT = tasksByDay[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-label={thaiDate(key, { day: 'numeric', month: 'long' })}
                aria-pressed={selected === key}
                className={`h-11 rounded-ui border-2 flex flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                  ${selected === key ? 'bg-brand-strong text-white border-line' : key === today ? 'bg-brand-soft border-line' : 'border-transparent hover:bg-mist'}`}
              >
                <span className="thai-font text-xs font-semibold tabular-nums">{Number(key.slice(8))}</span>
                <span className="flex gap-0.5 h-1.5" aria-hidden="true">
                  {eventsByDay[key] && <i className="w-1.5 h-1.5 rounded-full bg-accent-pink" />}
                  {dayT && <i className={`w-1.5 h-1.5 rounded-full ${dayT.every((t) => t.done) ? 'bg-leaf' : 'bg-zone-sci'}`} />}
                </span>
              </button>
            )
          })}
        </div>
        <p className="thai-font text-xs text-ink-soft mt-2 flex gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-accent-pink" /> วันสำคัญ TCAS</span>
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-zone-sci" /> งานใน Habit</span>
        </p>
      </section>

      <section className="flex flex-col gap-2" aria-label="รายการของวันที่เลือก">
        <h4 className="thai-font text-sm font-bold">{selected === today ? 'วันนี้' : thaiDate(selected, { day: 'numeric', month: 'long', year: 'numeric' })}</h4>
        {dayEvents.length === 0 && dayTasks.length === 0 && <p className="thai-font text-sm text-ink-soft">ไม่มีรายการในวันนี้</p>}
        {dayEvents.length > 0 && <ul className="space-y-2">{dayEvents.map(renderEvent)}</ul>}
        {dayTasks.length > 0 && (
          <ul className="space-y-1.5">
            {dayTasks.map((t) => (
              <li key={t.id} className="px-card px-3 py-2 bg-paper thai-font text-sm flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${t.done ? 'bg-leaf' : 'bg-zone-sci'}`} aria-hidden="true" />
                <span className={`flex-1 min-w-0 break-words ${t.done ? 'line-through text-ink-soft' : ''}`}>{t.text}</span>
                {t.tag && <span className="text-xs text-ink-soft shrink-0">{t.tag}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="กำลังจะมาถึง">
          <h4 className="thai-font text-sm font-bold">กำลังจะมาถึง</h4>
          <ul className="space-y-2">{upcoming.map(renderEvent)}</ul>
        </section>
      )}
      <p className="thai-font text-xs text-ink-soft">วันที่ส่วนกลางเท่านั้น แต่ละมหาวิทยาลัยกำหนดเองต่างกัน ตรวจสอบที่ mytcas.com อีกครั้ง</p>
    </div>
  )
}
