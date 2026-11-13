import { useMemo } from 'react'
import { Timer, ListChecks, BookOpen, Bot, Briefcase, Check } from 'lucide-react'
import { useLifeStore } from '../stores/useLifeStore'
import { useAiUsageStore } from '../stores/useAiUsageStore'
import { todayKey } from './lifeLogic'
import { thisWeekMinutes, readingStreak, formatMinutes } from './studyPlan'
import { thaiDate } from './checklistProjects'
import { subjectCountdowns, nextCountdown, nearestPortfolio, formatDays, urgency } from './countdownLogic'
import { useGoalPortfolios } from './useGoalPortfolios'
import { todayProgress, todayTasks, weekBars, barRatios, urgencyRing } from './widgetsLogic'

// Colours of each widget family (all design tokens): chip = icon background, deep = text accent.
const TONES = {
  health: { chip: 'var(--color-zone-health-soft)', deep: 'var(--color-zone-health-deep)', base: 'var(--color-zone-health)' },
  earth: { chip: 'var(--color-zone-earth-soft)', deep: 'var(--color-zone-earth-deep)', base: 'var(--color-zone-earth)' },
  sci: { chip: 'var(--color-zone-sci-soft)', deep: 'var(--color-zone-sci-deep)', base: 'var(--color-zone-sci)' },
  biz: { chip: 'var(--color-zone-biz-soft)', deep: 'var(--color-zone-biz-deep)', base: 'var(--color-zone-biz)' },
  brand: { chip: 'var(--color-brand-soft)', deep: 'var(--color-brand-strong)', base: 'var(--color-brand)' },
}
// Urgent days turn the accent red-ish whatever the family.
const URGENT = TONES.health

// Frame of every widget. The whole card is one big "open the app" button behind the content; things
// inside that need their own tap (tasks) sit above it with `relative z-10`.
function Frame({ tone, icon, title, onOpen, children }) {
  const t = TONES[tone]
  return (
    <section
      aria-label={title}
      className="relative h-full w-full px-card bg-paper/85 backdrop-blur-md p-3 flex flex-col gap-2 overflow-hidden active:scale-[0.985] transition-transform"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`เปิดแอปของ ${title}`}
        className="absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />
      <header className="relative flex items-center gap-1.5 pointer-events-none">
        <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: t.chip, color: t.deep }} aria-hidden="true">{icon}</span>
        <h3 className="thai-font text-xs font-bold truncate" style={{ color: t.deep }}>{title}</h3>
      </header>
      <div className="relative flex-1 min-h-0 pointer-events-none">{children}</div>
    </section>
  )
}

// A circular gauge: `ratio` 0..1 around a centre label.
function Ring({ ratio, color, size = 64, children }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-mist)" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, ratio)))} style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.32, 0.72, 0, 1)' }} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">{children}</span>
    </span>
  )
}

const dayColor = (days) => (urgency(days) === 'soon' ? URGENT.deep : 'var(--color-ink)')

function ExamNext({ onOpen }) {
  const target = useLifeStore((s) => s.target)
  const scores = useLifeStore((s) => s.scores)
  const today = todayKey()
  const next = useMemo(() => nextCountdown(subjectCountdowns({ target, scores, today })), [target, scores, today])
  return (
    <Frame tone="health" icon={<Timer size={12} />} title="สอบถัดไป" onOpen={onOpen}>
      {next ? (
        <div className="h-full flex items-center gap-2">
          <div className="min-w-0 flex-1 leading-tight">
            <p className="thai-font text-sm font-bold truncate">{next.subject}</p>
            <p className="thai-font text-xs text-ink-soft">{thaiDate(next.date)}</p>
            {next.session && <p className="thai-font text-xs text-ink-soft">{next.session}</p>}
          </div>
          <Ring ratio={urgencyRing(next.days)} color={URGENT.base} size={68}>
            <span className="font-display font-extrabold text-2xl tabular-nums" style={{ color: dayColor(next.days) }}>{next.days === 0 ? '!' : next.days}</span>
            <span className="thai-font text-xs font-bold mt-0.5">{next.days === 0 ? 'วันนี้' : 'วัน'}</span>
          </Ring>
        </div>
      ) : <p className="thai-font text-xs text-ink-soft self-center">ตั้งเป้าหมายใน Goal แล้ววันสอบจะขึ้นที่นี่</p>}
    </Frame>
  )
}

function ExamList({ onOpen }) {
  const target = useLifeStore((s) => s.target)
  const scores = useLifeStore((s) => s.scores)
  const today = todayKey()
  const rows = useMemo(() => subjectCountdowns({ target, scores, today }).filter((r) => r.days >= 0).slice(0, 3), [target, scores, today])
  return (
    <Frame tone="health" icon={<Timer size={12} />} title="ตารางสอบถัดไป" onOpen={onOpen}>
      {rows.length ? (
        <ul className="h-full flex flex-col justify-between">
          {rows.map((r) => (
            <li key={r.subject} className="flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full shrink-0" style={{ background: urgency(r.days) === 'soon' ? URGENT.base : 'var(--color-zone-sci)' }} aria-hidden="true" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="thai-font text-sm font-bold block truncate">{r.subject}</span>
                <span className="thai-font text-xs text-ink-soft block truncate">{thaiDate(r.date)}{r.session ? ` · ${r.session}` : ''}</span>
              </span>
              <span className="thai-font text-xs font-bold tabular-nums shrink-0" style={{ color: dayColor(r.days) }}>{formatDays(r.days)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="thai-font text-xs text-ink-soft">ยังไม่มีวิชาสอบที่ใกล้ถึง ตั้งเป้าหมายใน Goal</p>}
    </Frame>
  )
}

function PlanToday({ onOpen }) {
  const tasks = useLifeStore((s) => s.tasks)
  const toggleTask = useLifeStore((s) => s.toggleTask)
  const today = todayKey()
  const p = todayProgress(tasks, today)
  const list = todayTasks(tasks, today, 3)
  return (
    <Frame tone="earth" icon={<ListChecks size={12} />} title="แผนวันนี้" onOpen={onOpen}>
      {p.total ? (
        <div className="h-full flex items-center gap-3">
          <Ring ratio={p.percent / 100} color={TONES.earth.base} size={64}>
            <span className="font-display font-extrabold text-base tabular-nums">{p.done}/{p.total}</span>
          </Ring>
          <ul className="min-w-0 flex-1 flex flex-col gap-1 pointer-events-auto relative z-10">
            {list.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggleTask(t.id)}
                  aria-pressed={t.done}
                  className="w-full flex items-center gap-2 text-left rounded-md hover:bg-mist active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="w-4 h-4 rounded shrink-0 flex items-center justify-center border-2" style={{ borderColor: TONES.earth.base, background: t.done ? TONES.earth.base : 'transparent', color: 'var(--color-paper)' }} aria-hidden="true">
                    {t.done && <Check size={11} strokeWidth={3.5} />}
                  </span>
                  <span className={`thai-font text-xs truncate ${t.done ? 'line-through text-ink-soft' : 'font-semibold'}`}>{t.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : <p className="thai-font text-xs text-ink-soft">วันนี้ยังไม่มีงานในแผน เปิด Habit เพื่อสร้างแผน</p>}
    </Frame>
  )
}

const DAY_LETTERS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

function ReadingWeek({ onOpen }) {
  const readLog = useLifeStore((s) => s.readLog)
  const today = todayKey()
  const bars = weekBars(readLog, today)
  const ratios = barRatios(bars)
  return (
    <Frame tone="sci" icon={<BookOpen size={12} />} title="อ่านหนังสือสัปดาห์นี้" onOpen={onOpen}>
      <div className="h-full flex gap-3">
        <div className="shrink-0 flex flex-col justify-center leading-tight">
          <p className="font-display font-extrabold text-2xl">{formatMinutes(thisWeekMinutes(readLog, today))}</p>
          <p className="thai-font text-xs text-ink-soft">ต่อเนื่อง {readingStreak(readLog, today)} วัน</p>
        </div>
        <div className="flex-1 min-w-0 flex items-end gap-1.5" role="img" aria-label={`เวลาอ่านรายวัน ${bars.map((b, i) => `${DAY_LETTERS[i]} ${b.minutes} นาที`).join(', ')}`}>
          {bars.map((b, i) => (
            <div key={b.key} className="flex-1 h-full flex flex-col justify-end items-center gap-0.5">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{ height: `${Math.max(b.minutes ? 12 : 6, ratios[i] * 100)}%`, background: b.minutes ? (b.today ? TONES.sci.deep : TONES.sci.base) : 'var(--color-mist)', opacity: b.future ? 0.45 : 1 }}
                />
              </div>
              <span className={`thai-font text-xs leading-none ${b.today ? 'font-bold' : 'text-ink-soft'}`} aria-hidden="true">{DAY_LETTERS[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  )
}

function Portfolio({ onOpen }) {
  const goals = useLifeStore((s) => s.goals)
  const today = todayKey()
  const byGoal = useGoalPortfolios(goals, today)
  const best = nearestPortfolio(byGoal, goals)
  const loading = goals.some((g) => !byGoal[g.id])
  return (
    <Frame tone="biz" icon={<Briefcase size={12} />} title="ยื่นพอร์ต" onOpen={onOpen}>
      {best ? (
        <div className="leading-tight">
          <p className="font-display font-extrabold text-4xl tabular-nums" style={{ color: dayColor(best.days) }}>{best.days === 0 ? 'วันนี้' : best.days}</p>
          <p className="thai-font text-xs font-bold mt-1">{best.days > 0 ? 'วันก่อนส่งแฟ้ม' : 'วันส่งแฟ้ม'}</p>
          <p className="thai-font text-xs text-ink-soft truncate">{best.goal.program || best.goal.faculty || best.title}</p>
        </div>
      ) : (
        <p className="thai-font text-xs text-ink-soft self-center">
          {goals.length === 0 ? 'เพิ่มเป้าหมายใน Goal เพื่อดูวันยื่นพอร์ต' : loading ? 'กำลังโหลด...' : 'ไม่พบวันส่งแฟ้มรอบ 1 ที่ยังไม่ถึง'}
        </p>
      )}
    </Frame>
  )
}

function Secretary({ onOpen }) {
  const st = useAiUsageStore((s) => s.status())
  const ratio = st.limits.day ? Math.min(1, st.used.day / st.limits.day) : 0
  return (
    <Frame tone="brand" icon={<Bot size={12} />} title="เลขา AI" onOpen={onOpen}>
      <div className="h-full flex flex-col justify-center gap-1.5 leading-tight">
        <p className="font-display font-extrabold text-4xl tabular-nums" style={{ color: st.allowed ? 'var(--color-ink)' : URGENT.deep }}>{st.left}</p>
        <p className="thai-font text-xs font-bold">ข้อความที่เหลือวันนี้</p>
        <span className="block h-1.5 rounded-full bg-mist overflow-hidden" role="progressbar" aria-valuenow={st.used.day} aria-valuemin={0} aria-valuemax={st.limits.day} aria-label="ใช้ไปวันนี้">
          <span className="block h-full rounded-full transition-all" style={{ width: `${ratio * 100}%`, background: ratio >= 0.9 ? URGENT.base : TONES.brand.base }} />
        </span>
      </div>
    </Frame>
  )
}

const CARDS = { 'exam-next': ExamNext, 'exam-list': ExamList, 'plan-today': PlanToday, 'reading-week': ReadingWeek, portfolio: Portfolio, secretary: Secretary }

export default function WidgetCard({ id, onOpen }) {
  const C = CARDS[id]
  return C ? <C onOpen={onOpen} /> : null
}
