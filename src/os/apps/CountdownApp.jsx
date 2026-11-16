import { useMemo } from 'react'
import { Target, ListChecks, Briefcase, CalendarClock } from 'lucide-react'
import { useLifeStore } from '../../stores/useLifeStore'
import { todayKey } from '../lifeLogic'
import { goalTitle, goalSubtitle } from '../goalLogic'
import { thaiDate } from '../checklistProjects'
import { useGoalPortfolios } from '../useGoalPortfolios'
import { formatDays, urgency, subjectCountdowns, nextCountdown, seasonMilestones } from '../countdownLogic'
import { findApp } from '../apps'

const TONE = {
  past: 'text-ink-soft',
  soon: 'text-zone-health-deep',
  near: 'text-brand-strong',
  far: 'text-ink',
}

function Days({ days, className = '' }) {
  return <span className={`thai-font font-bold ${TONE[urgency(days)]} ${className}`}>{formatDays(days)}</span>
}

function Section({ icon, title, children, hint }) {
  return (
    <section className="px-card p-4 flex flex-col gap-3" aria-label={title}>
      <h3 className="thai-font font-bold flex items-center gap-2">{icon} {title}</h3>
      {hint && <p className="thai-font text-xs text-ink-soft -mt-1">{hint}</p>}
      {children}
    </section>
  )
}

// Countdown: days left to every exam subject, to each portfolio deadline of your goals, and to the TCAS milestones.
export default function CountdownApp({ onOpenApp }) {
  const { target, scores, goals } = useLifeStore()
  const today = todayKey()
  const subjects = useMemo(() => subjectCountdowns({ target, scores, today }), [target, scores, today])
  const next = nextCountdown(subjects)
  const milestones = useMemo(() => seasonMilestones(today).slice(0, 8), [today])
  const portfolios = useGoalPortfolios(goals, today)
  const open = (id) => { const a = findApp(id); if (a && onOpenApp) onOpenApp(a) }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
      <section className="px-card p-5 bg-brand-soft flex flex-col items-center text-center gap-1" aria-label="วันสอบที่ใกล้ที่สุด" aria-live="polite">
        {next ? (
          <>
            <p className="thai-font text-sm text-ink-soft">{next.subject} · {thaiDate(next.date)}{next.session ? ` (${next.session})` : ''}</p>
            <p className="thai-font font-extrabold text-5xl text-brand-strong tabular-nums">{next.days === 0 ? 'วันนี้!' : next.days}</p>
            {next.days > 0 && <p className="thai-font text-sm font-bold">วันก่อนสอบ</p>}
          </>
        ) : (
          <>
            <p className="thai-font font-bold">{subjects.length ? 'สอบครบทุกวิชาแล้ว' : 'ยังไม่มีวันสอบ'}</p>
            <p className="thai-font text-sm text-ink-soft">{subjects.length ? 'เก่งมากน้อง รอผลสอบนะ' : 'เลือกเป้าหมายใน Goal แล้ววันสอบรายวิชาจะขึ้นที่นี่'}</p>
          </>
        )}
        <button type="button" onClick={() => open('goal')} className="px-btn px-3 py-1.5 mt-2 thai-font text-xs font-bold bg-paper flex items-center gap-1.5">
          <Target size={14} aria-hidden="true" /> {subjects.length ? 'แก้เป้าหมายและวันสอบ' : 'ตั้งเป้าหมาย'}
        </button>
      </section>

      <Section icon={<CalendarClock size={18} aria-hidden="true" />} title="นับถอยหลังรายวิชา" hint={subjects.some((s) => !s.exact && !s.manual) ? 'วิชาที่ไม่ระบุคาบ ใช้วันแรกของช่วงสอบนั้น ตรวจตารางสอบทางการที่ mytcas.com อีกครั้ง' : undefined}>
        {subjects.length === 0 && <p className="thai-font text-sm text-ink-soft">ยังไม่มีวิชาสอบ ตั้งเป้าหมายใน Goal ก่อน</p>}
        <ul className="flex flex-col divide-y-2 divide-hairline">
          {subjects.map((s) => (
            <li key={s.subject} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="thai-font text-sm font-bold truncate">{s.subject}</p>
                <p className="thai-font text-xs text-ink-soft">{thaiDate(s.date)}{s.session ? ` · ${s.session}` : ''}{s.manual ? ' · วันที่ตั้งเอง' : ''}</p>
              </div>
              <Days days={s.days} className="text-sm shrink-0" />
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={<Briefcase size={18} aria-hidden="true" />} title="ยื่นพอร์ต (รอบ 1)" hint="วันส่งแฟ้มสะสมผลงานของเป้าหมายใน Goal ข้อมูลจาก TCAS FOLIO ของ MyTCAS ตรวจวันจริงกับประกาศของโครงการอีกครั้ง">
        {goals.length === 0 && <p className="thai-font text-sm text-ink-soft">ยังไม่มีเป้าหมาย เพิ่มเป้าหมายใน Goal เพื่อดูวันยื่นพอร์ตของโครงการ</p>}
        {goals.map((g, i) => {
          const info = portfolios[g.id]
          return (
            <div key={g.id} className="flex flex-col gap-1.5">
              <p className="thai-font text-sm font-bold">{i === 0 ? 'เป้าหลัก · ' : ''}{goalTitle(g)} <span className="font-normal text-xs text-ink-soft">{goalSubtitle(g)}</span></p>
              {!info && <p className="thai-font text-xs text-ink-soft">กำลังโหลด...</p>}
              {info?.status === 'none' && <p className="thai-font text-xs text-ink-soft">เป้าหมายนี้ไม่ได้เลือกจาก MyTCAS จึงยังไม่มีข้อมูลโครงการ</p>}
              {info?.status === 'error' && <p role="alert" className="thai-font text-xs text-zone-health-deep">โหลดข้อมูลโครงการไม่สำเร็จ</p>}
              {info?.status === 'ready' && info.rows.length === 0 && <p className="thai-font text-xs text-ink-soft">ไม่พบโครงการรอบ 1 ที่ระบุวันส่งแฟ้ม</p>}
              <ul className="flex flex-col gap-1.5">
                {info?.rows.map((r) => (
                  <li key={r.key} className="flex items-center gap-3 bg-mist rounded-ui px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="thai-font text-sm break-words">{r.title}</p>
                      <p className="thai-font text-xs text-ink-soft">ส่งแฟ้มภายใน {thaiDate(r.date)}{r.editUntil ? ` · แก้ไขได้ถึง ${thaiDate(r.editUntil)}` : ''}</p>
                    </div>
                    <Days days={r.days} className="text-sm shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {goals.length > 0 && (
          <button type="button" onClick={() => open('checklist')} className="px-btn px-3 py-1.5 thai-font text-xs font-bold bg-paper flex items-center gap-1.5 self-start">
            <ListChecks size={14} aria-hidden="true" /> เปิดเช็กลิสต์ของโครงการ
          </button>
        )}
      </Section>

      <Section icon={<CalendarClock size={18} aria-hidden="true" />} title="ปฏิทิน TCAS" hint="วันสำคัญของปีการศึกษา 2570 บางวันอาจเปลี่ยน ตรวจที่ mytcas.com">
        <ul className="flex flex-col divide-y-2 divide-hairline">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="thai-font text-sm break-words">{m.label}</p>
                <p className="thai-font text-xs text-ink-soft">{thaiDate(m.date)}</p>
              </div>
              <Days days={m.days} className="text-sm shrink-0" />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
