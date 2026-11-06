import { useMemo, useState } from 'react'
import { Plus, X, Flame, ChevronLeft, ChevronRight, CalendarClock, BookOpen, Target, Sparkles } from 'lucide-react'
import { useLifeStore } from '../../stores/useLifeStore'
import { goalProgress, habitStreak, todayKey, shiftKey } from '../lifeLogic'
import { daysUntil, planSuccess, weekMinutes, formatMinutes } from '../studyPlan'
import { findApp } from '../apps'

const TAGS = ['TGAT', 'A-LEVEL', 'อื่นๆ']
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

// Month grid: a dot under each day that has tasks (green when all are done).
function monthCells(year, month) {
  const first = new Date(year, month, 1)
  const count = new Date(year, month + 1, 0).getDate()
  const cells = Array(first.getDay()).fill(null)
  for (let d = 1; d <= count; d++) cells.push(todayKey(new Date(year, month, d)))
  return cells
}

function Card(props) {
  const { Icon, title, children, tone } = props
  return (
    <section className="px-card p-4 snap-center shrink-0 w-[78%] sm:w-64 flex flex-col gap-1.5" style={{ background: tone }}>
      <h4 className="thai-font text-xs font-bold text-ink-soft flex items-center gap-1.5">
        <Icon size={14} aria-hidden="true" /> {title}
      </h4>
      {children}
    </section>
  )
}

// Habit: calendar + swipeable cards (countdown / reading time / success) on top,
// then the plan for the chosen day, a to-do list and daily habits.
export default function HabitApp({ onOpenApp }) {
  const { target, tasks, habits, readLog, planSummary, addTask, toggleTask, removeTask, addHabit, removeHabit, toggleHabitToday } = useLifeStore()
  const today = todayKey()
  const [selected, setSelected] = useState(today)
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [text, setText] = useState('')
  const [tag, setTag] = useState(TAGS[0])
  const [habit, setHabit] = useState('')

  const byDay = useMemo(() => {
    const map = {}
    for (const t of tasks) (map[t.date] ||= []).push(t)
    return map
  }, [tasks])
  const cells = useMemo(() => monthCells(cursor.y, cursor.m), [cursor])
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
  const dayTasks = byDay[selected] ?? []
  const pct = goalProgress(dayTasks)
  const left = daysUntil(target.examDate, today)
  const success = planSuccess(tasks, today)
  const week = weekMinutes(readLog, today)
  const goalLabel = [target.faculty, target.major].filter(Boolean).join(' / ')
  const hasPlan = tasks.some((t) => t.auto)
  const goal = findApp('goal')

  function moveMonth(delta) {
    setCursor(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  }

  const dayLabel = selected === today ? 'วันนี้' : selected === shiftKey(today, 1) ? 'พรุ่งนี้'
    : new Date(`${selected}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1" aria-label="การ์ดสรุป">
        <Card Icon={CalendarClock} title="นับถอยหลังสอบ" tone="var(--color-zone-soc-soft)">
          <p className="font-display font-bold text-3xl leading-none">
            {left == null ? '-' : left >= 0 ? left : 0}<span className="thai-font text-sm font-semibold ml-1">วัน</span>
          </p>
          <p className="thai-font text-xs text-ink-soft truncate">{goalLabel || 'ยังไม่ได้ตั้งเป้าหมาย'}</p>
          {left == null && goal && onOpenApp && (
            <button type="button" onClick={() => onOpenApp(goal)} className="px-btn px-3 py-1 thai-font text-xs font-bold bg-paper self-start mt-1">
              <Target size={12} className="inline mr-1" aria-hidden="true" />ตั้งเป้าหมาย
            </button>
          )}
        </Card>
        <Card Icon={BookOpen} title="เวลาอ่านหนังสือ" tone="var(--color-zone-sci-soft)">
          <p className="font-display font-bold text-2xl leading-none">{formatMinutes(week)}</p>
          <p className="thai-font text-xs text-ink-soft">7 วันที่ผ่านมา · วันนี้ {formatMinutes(readLog[today] || 0)}</p>
        </Card>
        <Card Icon={Target} title="ทำตามแผนได้" tone="var(--color-zone-earth-soft)">
          <p className="font-display font-bold text-3xl leading-none">{success.percent}%</p>
          <div className="h-2 rounded-full bg-paper overflow-hidden" role="progressbar" aria-valuenow={success.percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-zone-earth-deep" style={{ width: `${success.percent}%` }} />
          </div>
          <p className="thai-font text-xs text-ink-soft">{formatMinutes(success.doneMin)} จาก {formatMinutes(success.plannedMin)} ที่วางไว้</p>
        </Card>
        {planSummary && (
          <Card Icon={Sparkles} title="กลยุทธ์จากพี่" tone="var(--color-zone-biz-soft)">
            <p className="thai-font text-sm leading-relaxed">{planSummary}</p>
          </Card>
        )}
      </div>

      <section className="px-card p-3 flex flex-col gap-2" aria-label="ปฏิทิน">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="เดือนก่อน" className="p-1.5"><ChevronLeft size={18} /></button>
          <h3 className="thai-font font-bold text-sm">{monthLabel}</h3>
          <button type="button" onClick={() => moveMonth(1)} aria-label="เดือนถัดไป" className="p-1.5"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center thai-font text-xs text-ink-soft">
          {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, i) => {
            if (!key) return <span key={`e${i}`} />
            const list = byDay[key] ?? []
            const allDone = list.length > 0 && list.every((t) => t.done)
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-label={key}
                aria-pressed={key === selected}
                className={`h-10 rounded-ui flex flex-col items-center justify-center thai-font text-xs gap-0.5
                  ${key === selected ? 'bg-brand-strong text-white' : key === today ? 'bg-brand-soft font-bold' : 'hover:bg-mist'}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
              >
                {Number(key.slice(8))}
                <span className={`w-1.5 h-1.5 rounded-full ${list.length ? (allDone ? 'bg-zone-earth' : 'bg-zone-biz') : 'bg-transparent'}`} />
              </button>
            )
          })}
        </div>
      </section>

      <section className="px-card p-4 flex flex-col gap-3" aria-label={`แผน${dayLabel}`}>
        <div className="flex items-center justify-between">
          <h3 className="thai-font font-bold">แผน{dayLabel}</h3>
          <span className="thai-font text-sm font-bold text-brand-strong">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-mist overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-zone-earth transition-all" style={{ width: `${pct}%` }} />
        </div>
        {dayTasks.length === 0 && (
          <p className="thai-font text-sm text-ink-soft">
            {hasPlan ? 'วันนี้ไม่มีรายการ พักผ่อนได้เลย หรือเพิ่มของตัวเองด้านล่าง' : 'ยังไม่มีแผน ไปที่ Goal แล้วกด "วางแผนด้วย AI" หรือเพิ่มเองด้านล่าง'}
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {dayTasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 thai-font text-sm">
              <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} aria-label={t.text} className="w-5 h-5 shrink-0" />
              <span className={`flex-1 min-w-0 ${t.done ? 'line-through text-ink-soft' : ''}`}>{t.text}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-soft text-brand-strong font-bold shrink-0">{t.tag}</span>
              <button type="button" onClick={() => removeTask(t.id)} aria-label={`ลบ ${t.text}`} className="p-1"><X size={16} /></button>
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); addTask(text, tag, selected); setText('') }} className="flex gap-2" aria-label="to do list">
          <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="หมวด" className="px-input h-10 px-2 text-sm">
            {TAGS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="to do: เช่น ทำข้อสอบ TGAT 1 ชุด" aria-label="เพิ่ม to do" className="px-input h-10 px-3 text-sm flex-1 min-w-0" />
          <button type="submit" aria-label="เพิ่มงาน" className="px-btn px-3 bg-paper"><Plus size={18} /></button>
        </form>
      </section>

      <section className="px-card p-4 flex flex-col gap-3" aria-label="นิสัย">
        <h3 className="thai-font font-bold">นิสัยประจำวัน</h3>
        {habits.length === 0 && <p className="thai-font text-sm text-ink-soft">สร้างนิสัย เช่น อ่านหนังสือ 30 นาที</p>}
        <ul className="flex flex-col gap-2">
          {habits.map((h) => {
            const done = h.doneDates.includes(today)
            const streak = habitStreak(h.doneDates, today)
            return (
              <li key={h.id} className="flex items-center gap-2 thai-font text-sm">
                <button
                  type="button"
                  onClick={() => toggleHabitToday(h.id)}
                  aria-pressed={done}
                  className={`px-btn px-3 py-1 text-xs font-bold ${done ? 'bg-zone-earth-soft text-zone-earth-deep' : 'bg-paper'}`}
                >
                  {done ? 'ทำแล้ว' : 'ทำวันนี้'}
                </button>
                <span className="flex-1 min-w-0 truncate">{h.name}</span>
                <span className="flex items-center gap-1 text-xs font-bold text-zone-biz-deep"><Flame size={14} />{streak}</span>
                <button type="button" onClick={() => removeHabit(h.id)} aria-label={`ลบ ${h.name}`} className="p-1"><X size={16} /></button>
              </li>
            )
          })}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); addHabit(habit); setHabit('') }} className="flex gap-2">
          <input value={habit} onChange={(e) => setHabit(e.target.value)} placeholder="นิสัยใหม่" aria-label="นิสัยใหม่" className="px-input h-10 px-3 text-sm flex-1 min-w-0" />
          <button type="submit" aria-label="เพิ่มนิสัย" className="px-btn px-3 bg-paper"><Plus size={18} /></button>
        </form>
      </section>
    </div>
  )
}
