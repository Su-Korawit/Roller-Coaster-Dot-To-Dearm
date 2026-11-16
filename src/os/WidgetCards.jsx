import { useMemo } from 'react'
import { Timer, ListChecks, BookOpen, Bot, Briefcase, Check } from 'lucide-react'
import { useLifeStore } from '../stores/useLifeStore'
import { useAiLimit } from '../stores/useAiUsageStore'
import { todayKey } from './lifeLogic'
import { thisWeekMinutes, readingStreak, formatMinutes } from './studyPlan'
import { thaiDate } from './checklistProjects'
import { subjectCountdowns, nearestPortfolio, upcomingPortfolios, formatDays, urgency } from './countdownLogic'
import { useGoalPortfolios } from './useGoalPortfolios'
import { todayProgress, todayTasks, weekBars, barRatios, urgencyRing, weekStats } from './widgetsLogic'

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

const useExamRows = () => {
  const target = useLifeStore((s) => s.target)
  const scores = useLifeStore((s) => s.scores)
  const today = todayKey()
  return useMemo(() => subjectCountdowns({ target, scores, today }).filter((r) => r.days >= 0), [target, scores, today])
}

const Empty = ({ children }) => <p className="thai-font text-xs text-ink-soft self-center">{children}</p>

// A row of an exam list: coloured bar, subject + date, days left.
function ExamRow({ r }) {
  const bar = urgency(r.days) === 'soon' ? URGENT.base : 'var(--color-zone-sci)'
  return (
    <li className="flex items-center gap-2 min-h-[22px]">
      <span className="w-1.5 h-4 rounded-full shrink-0" style={{ background: bar }} aria-hidden="true" />
      <span className="min-w-0 flex-1 flex items-baseline gap-2">
        <span className="thai-font text-sm font-bold truncate">{r.subject}</span>
        <span className="thai-font text-xs text-ink-soft truncate shrink-0">{thaiDate(r.date)}{r.session ? ` · ${r.session}` : ''}</span>
      </span>
      <span className="thai-font text-xs font-bold tabular-nums shrink-0" style={{ color: dayColor(r.days) }}>{formatDays(r.days)}</span>
    </li>
  )
}

function ExamHero({ next, ringSize = 68 }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 leading-tight">
        <p className="thai-font text-sm font-bold truncate">{next.subject}</p>
        <p className="thai-font text-xs text-ink-soft">{thaiDate(next.date)}{next.session ? ` · ${next.session}` : ''}</p>
      </div>
      <Ring ratio={urgencyRing(next.days)} color={URGENT.base} size={ringSize}>
        <span className="font-display font-extrabold text-2xl tabular-nums" style={{ color: dayColor(next.days) }}>{next.days === 0 ? '!' : next.days}</span>
        <span className="thai-font text-xs font-bold mt-0.5">{next.days === 0 ? 'วันนี้' : 'วัน'}</span>
      </Ring>
    </div>
  )
}

function Countdown({ size, onOpen }) {
  const rows = useExamRows()
  const goals = useLifeStore((s) => s.goals)
  const byGoal = useGoalPortfolios(size === 'large' ? goals : [], todayKey())
  const best = nearestPortfolio(byGoal, goals)
  const next = rows[0]
  const title = size === 'small' ? 'สอบถัดไป' : 'ตารางสอบ'
  return (
    <Frame tone="health" icon={<Timer size={12} />} title={title} onOpen={onOpen}>
      {!next && <Empty>ตั้งเป้าหมายใน Goal แล้ววันสอบจะขึ้นที่นี่</Empty>}
      {next && size === 'small' && <div className="h-full flex items-center"><ExamHero next={next} ringSize={64} /></div>}
      {next && size === 'medium' && <ul className="h-full flex flex-col justify-between">{rows.slice(0, 3).map((r) => <ExamRow key={r.subject} r={r} />)}</ul>}
      {next && size === 'large' && (
        <div className="h-full flex flex-col gap-2">
          <ExamHero next={next} ringSize={76} />
          <ul className="flex-1 min-h-0 flex flex-col justify-between border-t-2 border-hairline pt-2">
            {rows.slice(1, best ? 4 : 5).map((r) => <ExamRow key={r.subject} r={r} />)}
          </ul>
          {best && (
            <p className="thai-font text-xs rounded-md px-2 py-1 truncate" style={{ background: TONES.biz.chip, color: TONES.biz.deep }}>
              ยื่นพอร์ต {formatDays(best.days)} · {best.goal.program || best.title}
            </p>
          )}
        </div>
      )}
    </Frame>
  )
}

function TaskList({ list }) {
  const toggleTask = useLifeStore((s) => s.toggleTask)
  return (
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
  )
}

function Plan({ size, onOpen }) {
  const tasks = useLifeStore((s) => s.tasks)
  const today = todayKey()
  const p = todayProgress(tasks, today)
  const list = todayTasks(tasks, today, size === 'large' ? 7 : 3)
  const ring = (px) => (
    <Ring ratio={p.percent / 100} color={TONES.earth.base} size={px}>
      <span className="font-display font-extrabold text-base tabular-nums">{p.done}/{p.total}</span>
      <span className="thai-font text-xs text-ink-soft">ข้อ</span>
    </Ring>
  )
  return (
    <Frame tone="earth" icon={<ListChecks size={12} />} title="แผนวันนี้" onOpen={onOpen}>
      {!p.total && <Empty>วันนี้ยังไม่มีงานในแผน เปิด Habit เพื่อสร้างแผน</Empty>}
      {p.total > 0 && size === 'small' && <div className="h-full flex items-center gap-3">{ring(64)}<p className="thai-font text-xs font-bold leading-snug">{p.percent === 100 ? 'ครบแล้ว เก่งมาก' : `เหลืออีก ${p.total - p.done} ข้อ`}</p></div>}
      {p.total > 0 && size === 'medium' && <div className="h-full flex items-center gap-3">{ring(64)}<TaskList list={list} /></div>}
      {p.total > 0 && size === 'large' && (
        <div className="h-full flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {ring(60)}
            <div className="min-w-0 flex-1 leading-tight">
              <p className="font-display font-extrabold text-2xl tabular-nums">{p.percent}%</p>
              <p className="thai-font text-xs text-ink-soft">{p.percent === 100 ? 'ทำครบทุกข้อแล้ว' : `เหลืออีก ${p.total - p.done} ข้อ`}</p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden border-t-2 border-hairline pt-2 flex"><TaskList list={list} /></div>
        </div>
      )}
    </Frame>
  )
}

const DAY_LETTERS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

function Bars({ bars, ratios, tall }) {
  return (
    <div className="flex-1 min-w-0 flex items-end gap-1.5" role="img" aria-label={`เวลาอ่านรายวัน ${bars.map((b, i) => `${DAY_LETTERS[i]} ${b.minutes} นาที`).join(', ')}`}>
      {bars.map((b, i) => (
        <div key={b.key} className={`flex-1 ${tall ? 'h-full' : 'h-full'} flex flex-col justify-end items-center gap-0.5`}>
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
  )
}

function Stat({ label, value }) {
  return (
    <div className="flex-1 rounded-md px-2 py-1.5 leading-tight" style={{ background: TONES.sci.chip }}>
      <p className="font-display font-extrabold text-base" style={{ color: TONES.sci.deep }}>{value}</p>
      <p className="thai-font text-xs text-ink-soft truncate">{label}</p>
    </div>
  )
}

function Reading({ size, onOpen }) {
  const readLog = useLifeStore((s) => s.readLog)
  const today = todayKey()
  const bars = weekBars(readLog, today)
  const ratios = barRatios(bars)
  const stats = weekStats(bars)
  const streak = readingStreak(readLog, today)
  const total = formatMinutes(thisWeekMinutes(readLog, today))
  return (
    <Frame tone="sci" icon={<BookOpen size={12} />} title="อ่านหนังสือ" onOpen={onOpen}>
      {size === 'small' && (
        <div className="h-full flex flex-col justify-center leading-tight">
          <p className="font-display font-extrabold text-3xl">{total}</p>
          <p className="thai-font text-xs font-bold">สัปดาห์นี้</p>
          <p className="thai-font text-xs text-ink-soft">ต่อเนื่อง {streak} วัน</p>
        </div>
      )}
      {size === 'medium' && (
        <div className="h-full flex gap-3">
          <div className="shrink-0 flex flex-col justify-center leading-tight">
            <p className="font-display font-extrabold text-2xl">{total}</p>
            <p className="thai-font text-xs text-ink-soft">ต่อเนื่อง {streak} วัน</p>
          </div>
          <Bars bars={bars} ratios={ratios} />
        </div>
      )}
      {size === 'large' && (
        <div className="h-full flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <p className="font-display font-extrabold text-3xl">{total}</p>
            <p className="thai-font text-xs text-ink-soft">สัปดาห์นี้</p>
          </div>
          <div className="flex-1 min-h-0 flex"><Bars bars={bars} ratios={ratios} tall /></div>
          <div className="flex gap-2">
            <Stat label="ต่อเนื่อง" value={`${streak} วัน`} />
            <Stat label="วันที่อ่าน" value={`${stats.activeDays}/7`} />
            <Stat label="เฉลี่ยต่อวัน" value={formatMinutes(stats.avg)} />
          </div>
        </div>
      )}
    </Frame>
  )
}

function Portfolio({ size, onOpen }) {
  const goals = useLifeStore((s) => s.goals)
  const today = todayKey()
  const byGoal = useGoalPortfolios(goals, today)
  const best = nearestPortfolio(byGoal, goals)
  const list = upcomingPortfolios(byGoal, goals, 3)
  const loading = goals.some((g) => !byGoal[g.id])
  const none = goals.length === 0 ? 'เพิ่มเป้าหมายใน Goal เพื่อดูวันยื่นพอร์ต' : loading ? 'กำลังโหลด...' : 'ไม่พบวันส่งแฟ้มรอบ 1 ที่ยังไม่ถึง'
  return (
    <Frame tone="biz" icon={<Briefcase size={12} />} title="ยื่นพอร์ต" onOpen={onOpen}>
      {!best && <Empty>{none}</Empty>}
      {best && size === 'small' && (
        <div className="leading-tight">
          <p className="font-display font-extrabold text-4xl tabular-nums" style={{ color: dayColor(best.days) }}>{best.days === 0 ? 'วันนี้' : best.days}</p>
          <p className="thai-font text-xs font-bold mt-1">{best.days > 0 ? 'วันก่อนส่งแฟ้ม' : 'วันส่งแฟ้ม'}</p>
          <p className="thai-font text-xs text-ink-soft truncate">{best.goal.program || best.goal.faculty || best.title}</p>
        </div>
      )}
      {best && size === 'medium' && (
        <ul className="h-full flex flex-col justify-between">
          {list.map((r) => (
            <li key={r.key} className="flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full shrink-0" style={{ background: TONES.biz.base }} aria-hidden="true" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="thai-font text-sm font-bold block truncate">{r.goal.program || r.goal.faculty || r.title}</span>
                <span className="thai-font text-xs text-ink-soft block truncate">{thaiDate(r.date)} · {r.title}</span>
              </span>
              <span className="thai-font text-xs font-bold tabular-nums shrink-0" style={{ color: dayColor(r.days) }}>{formatDays(r.days)}</span>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  )
}

function Meter({ label, used, max }) {
  const ratio = max ? Math.min(1, used / max) : 0
  return (
    <div className="flex flex-col gap-1">
      <p className="thai-font text-xs flex justify-between"><span className="font-bold">{label}</span><span className="text-ink-soft tabular-nums">{used}/{max}</span></p>
      <span className="block h-2 rounded-full bg-mist overflow-hidden" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <span className="block h-full rounded-full transition-all" style={{ width: `${ratio * 100}%`, background: ratio >= 0.9 ? URGENT.base : TONES.brand.base }} />
      </span>
    </div>
  )
}

function Secretary({ size, onOpen }) {
  const st = useAiLimit()
  return (
    <Frame tone="brand" icon={<Bot size={12} />} title="เลขา AI" onOpen={onOpen}>
      {size === 'small' ? (
        <div className="h-full flex flex-col justify-center gap-1 leading-tight">
          <p className="font-display font-extrabold text-4xl tabular-nums" style={{ color: st.allowed ? 'var(--color-ink)' : URGENT.deep }}>{st.left}</p>
          <p className="thai-font text-xs font-bold">ข้อความที่เหลือวันนี้</p>
        </div>
      ) : (
        <div className="h-full flex items-center gap-4">
          <div className="shrink-0 leading-tight">
            <p className="font-display font-extrabold text-4xl tabular-nums" style={{ color: st.allowed ? 'var(--color-ink)' : URGENT.deep }}>{st.left}</p>
            <p className="thai-font text-xs text-ink-soft">เหลือคุยวันนี้</p>
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <Meter label="วันนี้" used={st.used.day} max={st.limits.day} />
            <Meter label="สัปดาห์นี้" used={st.used.week} max={st.limits.week} />
          </div>
        </div>
      )}
    </Frame>
  )
}

const CARDS = { countdown: Countdown, plan: Plan, reading: Reading, portfolio: Portfolio, secretary: Secretary }

export default function WidgetCard({ family, size, onOpen }) {
  const C = CARDS[family]
  return C ? <C size={size} onOpen={onOpen} /> : null
}
