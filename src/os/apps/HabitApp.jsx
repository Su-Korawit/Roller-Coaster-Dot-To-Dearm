import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, CalendarClock, BookOpen, Target, Sparkles } from 'lucide-react'
import { useLifeStore } from '../../stores/useLifeStore'
import { goalProgress, todayKey, shiftKey } from '../lifeLogic'
import { daysUntil, planSuccess, weekMinutes, formatMinutes } from '../studyPlan'
import { findApp } from '../apps'
import { effectiveExamDate } from '../goalLogic'
import { subjectExam } from '../../data/tcasCalendar'
import { gridWeeks, dayLevel, tasksByDay, weekIndexOf } from '../habitGrid'

const TAGS = ['TGAT', 'A-LEVEL', 'อื่นๆ']
const ROW_LABEL = ['', 'จ', '', 'พ', '', 'ศ', '']
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const AUTOPLAY_MS = 6000

// Green ramp for the grid (level 0..4), built from the theme's earth-green token.
const LEVEL_BG = [
  'var(--color-mist)',
  'color-mix(in srgb, var(--color-zone-earth) 22%, white)',
  'color-mix(in srgb, var(--color-zone-earth) 45%, white)',
  'color-mix(in srgb, var(--color-zone-earth) 75%, white)',
  'var(--color-zone-earth-deep)',
]

// Same banner strip as the Store (swipe / dots / autoplay). Art goes in /assets/os/banners/habit-<id>.webp;
// until it exists the slide keeps its colour gradient.
function Banners({ slides }) {
  const scroller = useRef(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState({})

  useEffect(() => {
    if (paused || slides.length < 2) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const t = setInterval(() => {
      const el = scroller.current
      if (!el) return
      const cur = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
      el.scrollTo({ left: ((cur + 1) % slides.length) * el.clientWidth, behavior: 'smooth' })
    }, AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [paused, slides.length])

  return (
    <section
      aria-roledescription="carousel"
      aria-label="สรุปของคุณ"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={scroller}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="os-pages flex overflow-x-auto snap-x snap-mandatory rounded-slot"
      >
        {slides.map((b, i) => (
          <article
            key={b.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} จาก ${slides.length}: ${b.title}`}
            className="px-card relative w-full shrink-0 snap-start overflow-hidden text-white aspect-[8/3] min-h-[150px]"
            style={{ background: b.background }}
          >
            {!failed[b.id] && (
              <>
                <img src={`/assets/os/banners/habit-${b.id}.webp`} alt="" draggable={false} onError={() => setFailed((f) => ({ ...f, [b.id]: true }))} className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${b.scrim} 0%, ${b.scrim} 40%, transparent 80%)` }} aria-hidden="true" />
              </>
            )}
            <div className="relative h-full flex flex-col justify-center gap-1 p-5 max-w-[62%]">
              <h3 className="thai-font text-xs font-bold opacity-90 flex items-center gap-1.5"><b.Icon size={14} aria-hidden="true" /> {b.title}</h3>
              <p className="font-display font-bold text-3xl sm:text-4xl leading-none">{b.value}<span className="thai-font text-sm font-semibold ml-1">{b.unit}</span></p>
              {b.bar != null && (
                <div className="h-2 rounded-full bg-white/30 overflow-hidden" role="progressbar" aria-valuenow={b.bar} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-white" style={{ width: `${b.bar}%` }} />
                </div>
              )}
              <p className="thai-font text-sm opacity-95 leading-snug line-clamp-3">{b.text}</p>
              {b.cta && (
                <button type="button" onClick={b.cta.onClick} className="self-start mt-1 px-btn px-3 py-1.5 thai-font text-xs font-bold bg-paper text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  {b.cta.label}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="flex justify-center gap-2 mt-2" role="tablist" aria-label="เลือกการ์ด">
          {slides.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={index === i}
              aria-label={`การ์ด ${i + 1}`}
              onClick={() => scroller.current?.scrollTo({ left: i * scroller.current.clientWidth, behavior: 'smooth' })}
              className={`h-2.5 rounded-full bg-brand-strong transition-all ${index === i ? 'w-6' : 'w-2.5 opacity-30'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// GitHub-style grid: one square per day, green by how much of that day's plan is done. Exam days of the
// student's own subjects get an amber ring (with the subject names in the tooltip).
function Grid({ today, selected, onSelect, byDay, examDays }) {
  const lastExam = [...examDays.keys()].sort().pop() ?? ''
  const weeks = useMemo(() => gridWeeks(today, lastExam), [today, lastExam])
  const scroller = useRef(null)

  useEffect(() => {
    const el = scroller.current
    const at = weekIndexOf(weeks, today)
    if (el && at >= 0) el.scrollLeft = Math.max(0, at * 19 - el.clientWidth / 2)
  }, [weeks, today])

  return (
    <section className="px-card p-3 flex flex-col gap-2" aria-label="ปฏิทินแผนอ่านหนังสือ">
      <div className="flex gap-2">
        <div className="flex flex-col gap-[3px] pt-[18px] thai-font text-xs text-ink-soft shrink-0" aria-hidden="true">
          {ROW_LABEL.map((l, i) => <span key={i} className="h-4 leading-4">{l}</span>)}
        </div>
        <div ref={scroller} className="os-pages overflow-x-auto flex-1 min-w-0 pb-1">
          <div className="flex gap-[3px] w-max">
            {weeks.map((week, wi) => {
              const first = week[0]
              const month = Number(first.slice(5, 7)) - 1
              const prev = wi > 0 ? Number(weeks[wi - 1][0].slice(5, 7)) - 1 : -1
              return (
                <div key={first} className="flex flex-col gap-[3px]">
                  <span className="h-[15px] thai-font text-xs text-ink-soft leading-[15px] whitespace-nowrap" aria-hidden="true">{month !== prev ? MONTHS[month] : ''}</span>
                  {week.map((key) => {
                    const list = byDay[key] ?? []
                    const exam = examDays.get(key)
                    const level = dayLevel(list)
                    const title = `${Number(key.slice(8))} ${MONTHS[Number(key.slice(5, 7)) - 1]}${exam ? ` · สอบ ${exam.join(', ')}` : ''}${list.length ? ` · ทำแล้ว ${list.filter((t) => t.done).length}/${list.length}` : ''}`
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onSelect(key)}
                        title={title}
                        aria-label={title}
                        aria-pressed={key === selected}
                        className={`w-4 h-4 rounded-[3px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                          ${key === selected ? 'border-brand-strong ring-2 ring-brand-strong' : key === today ? 'border-ink' : 'border-transparent'}
                          ${exam ? 'ring-2 ring-zone-biz' : ''}`}
                        style={{ background: LEVEL_BG[level] }}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 thai-font text-xs text-ink-soft flex-wrap">
        <span>น้อย</span>
        {LEVEL_BG.map((c, i) => <i key={i} className="w-3.5 h-3.5 rounded-[3px]" style={{ background: c }} />)}
        <span>ทำครบ</span>
        <span className="ml-auto inline-flex items-center gap-1"><i className="w-3.5 h-3.5 rounded-[3px] ring-2 ring-zone-biz bg-paper" /> วันสอบ</span>
      </div>
    </section>
  )
}

// Habit: stat banners + a GitHub-style plan grid on top, then the plan for the chosen day and a to-do list.
export default function HabitApp({ onOpenApp }) {
  const { target, scores, tasks, readLog, planSummary, addTask, toggleTask, removeTask } = useLifeStore()
  const today = todayKey()
  const [selected, setSelected] = useState(today)
  const [text, setText] = useState('')
  const [tag, setTag] = useState(TAGS[0])

  const byDay = useMemo(() => tasksByDay(tasks), [tasks])
  // Exam day → subjects the student takes that day (own subjects only).
  const examDays = useMemo(() => {
    const map = new Map()
    for (const s of scores) {
      const x = subjectExam(s.subject)
      if (x) map.set(x.date, [...(map.get(x.date) ?? []), s.subject])
    }
    return map
  }, [scores])

  const dayTasks = byDay[selected] ?? []
  const pct = goalProgress(dayTasks)
  const left = daysUntil(effectiveExamDate(target, scores), today)
  const success = planSuccess(tasks, today)
  const week = weekMinutes(readLog, today)
  const goalLabel = [target.faculty, target.major].filter(Boolean).join(' / ')
  const hasPlan = tasks.some((t) => t.auto)
  const goal = findApp('goal')

  const slides = [
    {
      id: 'countdown', title: 'นับถอยหลังสอบ', Icon: CalendarClock,
      value: left == null ? '-' : left >= 0 ? left : 0, unit: 'วัน',
      text: goalLabel || 'ยังไม่ได้ตั้งเป้าหมาย',
      background: 'linear-gradient(110deg, var(--color-brand-strong) 45%, var(--color-zone-soc))', scrim: 'var(--color-brand-strong)',
      cta: left == null && goal && onOpenApp ? { label: 'ตั้งเป้าหมาย', onClick: () => onOpenApp(goal) } : null,
    },
    {
      id: 'reading', title: 'เวลาอ่านหนังสือ', Icon: BookOpen,
      value: formatMinutes(week), unit: '',
      text: `7 วันที่ผ่านมา · วันนี้ ${formatMinutes(readLog[today] || 0)}`,
      background: 'linear-gradient(110deg, var(--color-zone-sci-deep) 45%, var(--color-zone-sci))', scrim: 'var(--color-zone-sci-deep)',
    },
    {
      id: 'success', title: 'ทำตามแผนได้', Icon: Target,
      value: success.percent, unit: '%', bar: success.percent,
      text: `${formatMinutes(success.doneMin)} จาก ${formatMinutes(success.plannedMin)} ที่วางไว้`,
      background: 'linear-gradient(110deg, var(--color-zone-earth-deep) 45%, var(--color-zone-earth))', scrim: 'var(--color-zone-earth-deep)',
    },
    ...(planSummary ? [{
      id: 'strategy', title: 'กลยุทธ์จากพี่', Icon: Sparkles, value: '', unit: '', text: planSummary,
      background: 'linear-gradient(110deg, var(--color-zone-biz-deep) 45%, var(--color-zone-biz))', scrim: 'var(--color-zone-biz-deep)',
    }] : []),
  ]

  const dayLabel = selected === today ? 'วันนี้' : selected === shiftKey(today, 1) ? 'พรุ่งนี้'
    : new Date(`${selected}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <Banners slides={slides} />
      <Grid today={today} selected={selected} onSelect={setSelected} byDay={byDay} examDays={examDays} />

      <section className="px-card p-4 flex flex-col gap-3" aria-label={`แผน${dayLabel}`}>
        <div className="flex items-center justify-between">
          <h3 className="thai-font font-bold">แผน{dayLabel}</h3>
          <span className="thai-font text-sm font-bold text-brand-strong">{pct}%</span>
        </div>
        {examDays.get(selected) && (
          <p className="thai-font text-sm font-bold text-zone-biz-deep">วันสอบ: {examDays.get(selected).join(', ')}</p>
        )}
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
    </div>
  )
}
