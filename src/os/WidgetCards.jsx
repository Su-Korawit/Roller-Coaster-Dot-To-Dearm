import { useMemo } from 'react'
import { Timer, ListChecks, BookOpen, Bot } from 'lucide-react'
import { useLifeStore } from '../stores/useLifeStore'
import { useAiUsageStore } from '../stores/useAiUsageStore'
import { todayKey } from './lifeLogic'
import { thisWeekMinutes, readingStreak, formatMinutes } from './studyPlan'
import { thaiDate } from './checklistProjects'
import { subjectCountdowns, nextCountdown } from './countdownLogic'
import { todayProgress } from './widgetsLogic'

// Shell of every widget: one tap opens the app it belongs to.
function Card({ icon, label, onOpen, children }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label} (เปิดแอป)`}
      className="px-card bg-paper/90 backdrop-blur-sm text-ink text-left p-3 w-40 h-24 shrink-0 flex flex-col justify-between active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="thai-font text-xs font-semibold text-ink-soft flex items-center gap-1.5">{icon} {label}</span>
      {children}
    </button>
  )
}

function CountdownWidget({ onOpen }) {
  const target = useLifeStore((s) => s.target)
  const scores = useLifeStore((s) => s.scores)
  const today = todayKey()
  const next = useMemo(() => nextCountdown(subjectCountdowns({ target, scores, today })), [target, scores, today])
  return (
    <Card icon={<Timer size={12} aria-hidden="true" />} label="นับถอยหลังสอบ" onOpen={onOpen}>
      {next ? (
        <div className="leading-tight">
          <p className="font-display font-extrabold text-3xl text-brand-strong tabular-nums">{next.days === 0 ? 'วันนี้' : next.days} <span className="thai-font text-xs font-bold text-ink">{next.days > 0 ? 'วัน' : ''}</span></p>
          <p className="thai-font text-xs text-ink-soft truncate">{next.subject} · {thaiDate(next.date)}</p>
        </div>
      ) : <p className="thai-font text-xs text-ink-soft">ตั้งเป้าหมายใน Goal เพื่อดูวันสอบ</p>}
    </Card>
  )
}

function HabitWidget({ onOpen }) {
  const tasks = useLifeStore((s) => s.tasks)
  const p = todayProgress(tasks, todayKey())
  return (
    <Card icon={<ListChecks size={12} aria-hidden="true" />} label="แผนวันนี้" onOpen={onOpen}>
      {p.total ? (
        <div className="leading-tight flex flex-col gap-1.5">
          <p className="font-display font-extrabold text-2xl tabular-nums">{p.done}<span className="text-ink-soft text-base">/{p.total}</span> <span className="thai-font text-xs font-bold">ข้อ</span></p>
          <span className="block h-1.5 rounded-full bg-mist overflow-hidden" role="progressbar" aria-valuenow={p.percent} aria-valuemin={0} aria-valuemax={100}><span className="block h-full bg-brand-strong transition-all" style={{ width: `${p.percent}%` }} /></span>
        </div>
      ) : <p className="thai-font text-xs text-ink-soft">วันนี้ยังไม่มีงานในแผน</p>}
    </Card>
  )
}

function ReadingWidget({ onOpen }) {
  const readLog = useLifeStore((s) => s.readLog)
  const today = todayKey()
  return (
    <Card icon={<BookOpen size={12} aria-hidden="true" />} label="อ่านหนังสือ" onOpen={onOpen}>
      <div className="leading-tight">
        <p className="font-display font-extrabold text-2xl">{formatMinutes(thisWeekMinutes(readLog, today))}</p>
        <p className="thai-font text-xs text-ink-soft">สัปดาห์นี้ · ต่อเนื่อง {readingStreak(readLog, today)} วัน</p>
      </div>
    </Card>
  )
}

function SecretaryWidget({ onOpen }) {
  const st = useAiUsageStore((s) => s.status())
  return (
    <Card icon={<Bot size={12} aria-hidden="true" />} label="เลขา AI" onOpen={onOpen}>
      <div className="leading-tight">
        <p className="font-display font-extrabold text-2xl tabular-nums">{st.left} <span className="thai-font text-xs font-bold">ข้อความ</span></p>
        <p className="thai-font text-xs text-ink-soft">เหลือคุยกับพี่วันนี้</p>
      </div>
    </Card>
  )
}

const CARDS = { countdown: CountdownWidget, habit: HabitWidget, reading: ReadingWidget, secretary: SecretaryWidget }

export default function WidgetCard({ id, onOpen }) {
  const C = CARDS[id]
  return C ? <C onOpen={onOpen} /> : null
}
