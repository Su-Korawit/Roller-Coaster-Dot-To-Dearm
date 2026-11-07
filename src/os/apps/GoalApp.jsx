import { useState } from 'react'
import { Plus, X, Sparkles, CalendarClock, Star, Search, Wand2, Target, Route, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import { useLifeStore } from '../../stores/useLifeStore'
import { useOsStore } from '../../stores/useOsStore'
import { todayKey } from '../lifeLogic'
import { daysUntil } from '../studyPlan'
import { findApp, homeAppIds } from '../apps'
import { AppTile } from '../AppIcon'
import InstallButton from '../InstallButton'
import { MAX_GOALS, goalSubtitle, goalTitle, makeGoal, planInput, universityAppId, subjectReadiness } from '../goalLogic'
import { generateStudyPlan } from '../../services/aiStudyPlan'
import { TCAS_CALENDAR, formatThaiRange, subjectExam } from '../../data/tcasCalendar'
import ProgramPicker from '../goal/ProgramPicker'
import StarterPicker from '../goal/StarterPicker'
import Advisor from '../goal/Advisor'
import { UniLogo } from '../goal/ui'

const TABS = [
  { id: 'goals', label: 'เป้าหมาย', Icon: Target },
  { id: 'plan', label: 'วางแผน', Icon: Route },
]

// Apps worth installing for the student's goals: each goal's university app + MyTCAS + TCAS Starter.
function recommendedApps(goals) {
  const ids = [...new Set([...goals.map((g) => universityAppId(g.universityId)), 'link-mytcas', 'link-tcasin'].filter(Boolean))]
  return ids.map((id) => findApp(id)).filter(Boolean)
}

function Recommended({ goals, onOpenApp }) {
  const installed = useOsStore((s) => s.installed)
  const onHome = homeAppIds(installed)
  const apps = recommendedApps(goals)
  return (
    <section className="px-card p-4 flex flex-col gap-3" aria-label="แอปแนะนำ">
      <div>
        <h3 className="thai-font font-bold text-sm">แอปที่แนะนำให้โหลด</h3>
        <p className="thai-font text-xs text-ink-soft">เว็บทางการของมหาวิทยาลัยที่เลือก และเครื่องมือเช็กข้อมูลรับสมัคร</p>
      </div>
      <ul className="flex gap-3 overflow-x-auto os-pages pb-1">
        {apps.map((app) => (
          <li key={app.id} className="shrink-0 w-24 flex flex-col items-center gap-1.5 text-center">
            <AppTile app={app} size={52} />
            <span className="thai-font text-xs font-semibold line-clamp-2 leading-tight min-h-[2rem]">{app.shortName ?? app.name}</span>
            <InstallButton app={app} installed={onHome.includes(app.id)} onOpen={onOpenApp} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function GoalCard({ goal, index, count, primary, onPrimary, onRemove, onMove, dragId, setDragId, onDropOn, children }) {
  return (
    <li
      draggable
      onDragStart={(e) => { setDragId(goal.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', goal.id) }}
      onDragOver={(e) => { if (dragId) e.preventDefault() }}
      onDrop={(e) => { e.preventDefault(); onDropOn(goal.id) }}
      onDragEnd={() => setDragId(null)}
      className={`px-card p-3 flex flex-col gap-2 ${primary ? 'bg-brand-soft' : 'bg-paper'} ${dragId === goal.id ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 cursor-grab text-ink-soft" aria-hidden="true" title="ลากเพื่อสลับลำดับ"><GripVertical size={18} /></span>
        <span className="w-7 h-7 shrink-0 rounded-full bg-brand-strong text-white font-display font-bold text-sm flex items-center justify-center" aria-label={`อันดับ ${index + 1}`}>{index + 1}</span>
        <UniLogo id={goal.universityId} name={goal.university} size={40} />
        <div className="min-w-0 flex-1">
          <p className="thai-font text-sm font-bold truncate">{goalTitle(goal)}</p>
          <p className="thai-font text-xs text-ink-soft truncate">{goalSubtitle(goal)}</p>
        </div>
        {count > 1 && (
          <span className="flex flex-col shrink-0">
            <button type="button" onClick={() => onMove(goal.id, -1)} disabled={index === 0} aria-label={`เลื่อน ${goalTitle(goal)} ขึ้น`} className="p-0.5 rounded-ui hover:bg-mist disabled:opacity-30"><ChevronUp size={16} /></button>
            <button type="button" onClick={() => onMove(goal.id, 1)} disabled={index === count - 1} aria-label={`เลื่อน ${goalTitle(goal)} ลง`} className="p-0.5 rounded-ui hover:bg-mist disabled:opacity-30"><ChevronDown size={16} /></button>
          </span>
        )}
        <button type="button" onClick={() => onRemove(goal.id)} aria-label={`ลบเป้าหมาย ${goalTitle(goal)}`} className="p-1.5 rounded-ui hover:bg-mist"><X size={16} /></button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {primary ? (
          <span className="thai-font text-xs font-bold text-brand-strong flex items-center gap-1"><Star size={14} className="fill-zone-biz text-zone-biz" aria-hidden="true" /> เป้าหมายหลัก (ใช้วางแผนอ่านหนังสือ)</span>
        ) : (
          <button type="button" onClick={() => onPrimary(goal.id)} className="px-btn px-3 py-1 thai-font text-xs font-bold bg-paper">ตั้งเป็นเป้าหลัก</button>
        )}
        {goal.source === 'tcasin' && <span className="thai-font text-xs text-zone-biz-deep font-semibold">TCAS Starter · ไม่ทางการ</span>}
      </div>
      {children}
    </li>
  )
}

const STATUS = {
  ahead: ['ทันแผน', 'text-zone-earth-deep'],
  behind: ['ตามให้ทัน', 'text-zone-health-deep'],
  none: ['ยังไม่มีแผน', 'text-ink-soft'],
  passed: ['สอบแล้ว', 'text-ink-soft'],
}

// One bar per subject. Real scores are only published after the exam, so the bar shows readiness:
// the fill is the share of the plan already done, the tick is how much of the time to the exam has passed.
function ReadinessBar({ subject, needed, exam, tasks, today }) {
  const r = subjectReadiness({ subject, tasks, examDate: exam?.date, today })
  const [label, tone] = STATUS[r.status]
  const pct = Math.round(r.done * 100)
  return (
    <li className="flex-1 min-w-0 flex flex-col gap-1">
      <div className="flex items-baseline gap-2 thai-font text-sm">
        <span className="font-bold shrink-0">{subject}</span>
        {needed && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-mist shrink-0">{needed}</span>}
        <span className="flex-1 min-w-0 truncate text-xs text-ink-soft">
          {exam ? `สอบ ${formatThaiRange(exam.date)}${exam.session ? ` ช่วง${exam.session}` : ''}${exam.exact ? ' (รอยืนยัน)' : ''}` : 'ไม่ทราบวันสอบ'}
        </span>
        <span className={`text-xs font-bold shrink-0 ${tone}`}>{label}</span>
      </div>
      <div className="relative h-3.5 rounded-full border-2 border-line-soft bg-mist overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`ความพร้อม ${subject}`}>
        <div className="h-full bg-zone-earth transition-all" style={{ width: `${pct}%` }} />
        {r.planned > 0 && <span className="absolute top-0 bottom-0 w-0.5 bg-ink" style={{ left: `${Math.round(r.time * 100)}%` }} aria-hidden="true" />}
      </div>
      <p className="thai-font text-xs text-ink-soft">
        {r.planned ? `ทำตามแผนแล้ว ${pct}%` : 'กด "วางแผนด้วย AI" ในแท็บวางแผน แถบจะเริ่มขึ้น'}
        {r.daysLeft != null && r.daysLeft >= 0 ? ` · อีก ${r.daysLeft} วัน` : ''}
      </p>
    </li>
  )
}

// Inside a goal card. Required scores come from the database (MyTCAS / TCAS Starter) and are only shown,
// never edited. The primary goal also gets a readiness bar per subject (real scores come after the exam).
const neededText = (r) => (r.needed ? `${r.estimated ? 'เป้า ~' : 'ต้องใช้ '}${r.needed}` : null)

function GoalSubjects({ goal, primary }) {
  const { scores, tasks } = useLifeStore()
  const today = todayKey()
  if (primary && scores.length > 0) {
    return (
      <div className="flex flex-col gap-3 border-t-2 border-hairline pt-3">
        <p className="thai-font text-xs text-ink-soft">คะแนนจริงยังไม่ประกาศจนกว่าจะสอบ แถบจึงบอกความพร้อมจากแผนที่ทำแล้ว (สีเขียว) เทียบกับเวลาที่ผ่านไปก่อนวันสอบ (ขีดดำ)</p>
        <ul className="flex flex-col gap-4">
          {scores.map((s) => <ReadinessBar key={s.id} subject={s.subject} needed={neededText(s)} exam={subjectExam(s.subject)} tasks={tasks} today={today} />)}
        </ul>
      </div>
    )
  }
  if (!goal.reqs.length) return null
  return (
    <ul className="flex flex-col gap-1 border-t-2 border-hairline pt-3">
      {goal.reqs.map((r) => (
        <li key={r.subject} className="flex items-center gap-2 thai-font text-sm">
          <span className="font-bold">{r.subject}</span>
          <span className="text-xs text-ink-soft flex-1">{subjectExam(r.subject) ? `สอบ ${formatThaiRange(subjectExam(r.subject).date)}` : ''}</span>
          {neededText(r) && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-mist">{neededText(r)}</span>}
        </li>
      ))}
    </ul>
  )
}

// Official TCAS calendar so the student never has to look dates up. Exams that match the primary
// goal's subjects are highlighted; every date comes from src/data/tcasCalendar.js.
function CalendarCard({ scores }) {
  const subjects = scores.map((x) => x.subject)
  const mine = (e) => subjects.some((name) => e.match.test(name))
  return (
    <section className="px-card p-4 flex flex-col gap-3" aria-label={`ปฏิทิน ${TCAS_CALENDAR.label}`}>
      <div>
        <h3 className="thai-font font-bold">ปฏิทิน {TCAS_CALENDAR.label}</h3>
        <p className="thai-font text-xs text-ink-soft">วันสำคัญของทุกรอบ ใส่ให้อัตโนมัติ ไม่ต้องหาเอง</p>
      </div>
      <ul className="flex flex-col gap-2">
        {TCAS_CALENDAR.exams.map((e) => {
          const left = daysUntil(e.start)
          return (
            <li key={e.id} className={`flex items-center gap-3 rounded-ui px-3 py-2 ${mine(e) ? 'bg-brand-soft' : 'bg-mist'}`}>
              <span className="min-w-0 flex-1">
                <span className="block thai-font text-sm font-semibold">{e.label}{mine(e) ? ' · วิชาของคุณ' : ''}</span>
                <span className="block thai-font text-xs text-ink-soft">{formatThaiRange(e.start, e.end)}</span>
              </span>
              <span className="thai-font text-xs font-bold text-brand-strong shrink-0">{left == null ? '' : left > 0 ? `อีก ${left} วัน` : left === 0 ? 'วันนี้' : 'ผ่านแล้ว'}</span>
            </li>
          )
        })}
      </ul>
      {subjects.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t-2 border-hairline pt-3">
          <h4 className="thai-font text-sm font-bold">วันสอบรายวิชาของคุณ</h4>
          <ul className="flex flex-col gap-1">
            {subjects.map((name) => {
              const x = subjectExam(name)
              return (
                <li key={name} className="flex items-center gap-2 thai-font text-sm">
                  <span className="font-semibold flex-1 min-w-0 truncate">{name}</span>
                  <span className="text-xs text-ink-soft">
                    {x ? `${formatThaiRange(x.date)}${x.session ? ` · ${x.session}` : ''}${x.exact ? ' · รอยืนยัน' : ' · ดูตารางที่ mytcas.com'}` : 'ไม่ทราบวันสอบ'}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="thai-font text-xs text-ink-soft">รายวิชาแยกวัน/ช่วงเวลาอ้างอิงจากเว็บเดียว ยังไม่ใช่ตารางทางการ ตรวจที่ mytcas.com ก่อนไปสอบจริง</p>
        </div>
      )}
      <ul className="flex flex-col gap-1.5 border-t-2 border-hairline pt-3">
        {TCAS_CALENDAR.rounds.map((r) => (
          <li key={r.round} className="thai-font text-xs">
            <span className="font-bold text-sm">รอบ {r.round} {r.label}</span>
            <span className="block text-ink-soft">
              {[r.start ? `รับสมัคร ${formatThaiRange(r.start, r.end)}` : '', r.result ? `ประกาศผล ${formatThaiRange(r.result)}` : ''].filter(Boolean).join(' · ')}
              {r.note ? `${r.start || r.result ? ' · ' : ''}${r.note}` : ''}
            </span>
          </li>
        ))}
      </ul>
      <p className="thai-font text-xs text-ink-soft">รวบรวมเมื่อ 7 พ.ย. 2569 จากปฏิทิน ทปอ. ที่เว็บข่าวหลายแห่งรายงานตรงกัน ตรวจประกาศล่าสุดที่ mytcas.com ก่อนสมัครจริง</p>
    </section>
  )
}

function PlanTab({ onOpenApp, onGoTo }) {
  const { target, scores, goals, hoursPerDay, setTarget, setHoursPerDay, applyPlan } = useLifeStore()
  const [planning, setPlanning] = useState(false)
  const [planMsg, setPlanMsg] = useState('')
  const [custom, setCustom] = useState(false)
  // Dates come from the TCAS calendar by subject (planInput), so older saved goals work too.
  const input = planInput(target, scores)
  const left = daysUntil(input.examDate)
  // Each subject is planned up to its own exam day (see studyPlan); at least one must still be ahead.
  const canPlan = input.scores.some((x) => { const n = daysUntil(x.examDate || input.examDate); return n != null && n >= 0 })
  const blocker = goals.length === 0 && scores.length === 0
    ? { text: 'ยังไม่ได้เลือกเป้าหมาย เลือกคณะที่อยากเข้าก่อน พี่จะดึงวิชาและวันสอบให้', to: 'goals', label: 'ไปเลือกเป้าหมาย' }
    : scores.length === 0
      ? { text: 'เป้าหมายนี้ยังไม่มีวิชาที่ต้องใช้ (เกณฑ์อาจยังไม่ประกาศ) ลองเลือกเป้าหมายอื่น หรือรอเกณฑ์ประกาศ', to: 'goals', label: 'ไปหน้าเป้าหมาย' }
      : { text: 'วิชาทั้งหมดผ่านวันสอบไปแล้ว ลองเปลี่ยนเป้าหมาย', to: 'goals', label: 'ไปหน้าเป้าหมาย' }

  async function plan() {
    setPlanning(true)
    setPlanMsg('')
    try {
      const out = await generateStudyPlan({ target, scores, hoursPerDay })
      if (out.tasks.length === 0) { setPlanMsg('ยังสร้างแผนไม่ได้ ตรวจวันสอบและวิชาอีกครั้ง'); return }
      applyPlan(out.tasks, out.summary)
      const habit = findApp('habit')
      if (habit && onOpenApp) onOpenApp(habit)
    } catch (e) {
      console.error('[GoalApp] plan failed:', e)
      setPlanMsg('สร้างแผนไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setPlanning(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CalendarCard scores={scores} />
      <section className="px-card p-4 flex flex-col gap-3" aria-label="วางแผน">
        <h3 className="thai-font font-bold">วางแผนอ่านหนังสือ</h3>
        {left != null && (
          <p className="thai-font text-sm flex items-center gap-2 text-brand-strong font-semibold">
            <CalendarClock size={16} aria-hidden="true" />
            {left > 0 ? `เหลืออีก ${left} วันถึงวันสอบวิชาแรก (${formatThaiRange(input.examDate)})` : left === 0 ? 'วันสอบคือวันนี้ สู้ๆ' : 'วันสอบวิชาแรกผ่านไปแล้ว'}
          </p>
        )}
        <p className="thai-font text-xs text-ink-soft">พี่จัดแผนให้แต่ละวิชาอ่านถึงวันสอบของวิชานั้น เช่น TGAT ถึง 30 ม.ค. ส่วน A-Level ต่อไปถึง 13 มี.ค.</p>
        <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
          อ่านหนังสือวันละกี่ชั่วโมง
          <input type="number" min="0.5" max="12" step="0.5" value={hoursPerDay} onChange={(e) => setHoursPerDay(e.target.value)} className="px-input h-10 px-3 text-sm text-ink bg-paper w-28" />
        </label>
        <button type="button" onClick={plan} disabled={!canPlan || planning} className="px-btn py-2.5 thai-font text-sm font-bold bg-brand-strong text-white disabled:opacity-50 flex items-center justify-center gap-2">
          <Sparkles size={16} aria-hidden="true" /> {planning ? 'พี่กำลังวางแผน...' : 'วางแผนด้วย AI'}
        </button>
        {!canPlan && (
          <div className="flex flex-col items-start gap-2">
            <p className="thai-font text-sm text-ink-soft">{blocker.text}</p>
            <button type="button" onClick={() => onGoTo(blocker.to)} className="px-btn px-3 py-1.5 thai-font text-xs font-bold bg-paper">{blocker.label}</button>
          </div>
        )}
        {planMsg && <p role="alert" className="thai-font text-sm text-zone-health-deep">{planMsg}</p>}
        <div className="border-t-2 border-hairline pt-3 flex flex-col gap-2">
          {custom ? (
            <>
              <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
                วันสอบที่ตั้งเอง (ใช้แทนปฏิทินกับทุกวิชา)
                <input type="date" value={target.examDate} onChange={(e) => setTarget({ examDate: e.target.value, examDateManual: true })} className="px-input h-10 px-3 text-sm text-ink bg-paper" />
              </label>
              <button type="button" onClick={() => { setCustom(false); setTarget({ examDateManual: false, examDate: '' }) }} className="self-start thai-font text-xs font-semibold text-brand-strong underline">กลับไปใช้ปฏิทิน TCAS</button>
            </>
          ) : (
            <button type="button" onClick={() => setCustom(true)} className="self-start thai-font text-xs font-semibold text-ink-soft underline">ตั้งวันสอบเอง (ไม่จำเป็น)</button>
          )}
        </div>
        <p className="thai-font text-xs text-ink-soft">ข้อมูลบันทึกในบัญชีของคุณอัตโนมัติ</p>
      </section>
    </div>
  )
}

// Goal: a small app of its own. Tabs: goals (up to 5, one primary) / scores / plan.
// Adding a goal: search MyTCAS (official), or let the advisor narrow it down; if MyTCAS has no match
// the picker offers TCAS Starter (Dek-D) as an unofficial fallback.
export default function GoalApp({ onOpenApp }) {
  const { goals, primaryGoalId, addGoal, removeGoal, reorderGoals } = useLifeStore()
  const [dragId, setDragId] = useState(null)
  const [tab, setTab] = useState('goals')
  const [flow, setFlow] = useState(null)   // null | { type: 'choose' | 'search' | 'advisor' | 'starter', initial? }
  const [msg, setMsg] = useState('')

  function pick(input) {
    const res = addGoal(makeGoal(input))
    setFlow(null)
    setTab('goals')
    setMsg(res.ok ? '' : res.reason === 'duplicate' ? 'เป้าหมายนี้มีอยู่แล้ว' : `เพิ่มได้สูงสุด ${MAX_GOALS} เป้าหมาย ลบอันเดิมก่อน`)
  }

  const full = goals.length >= MAX_GOALS
  const chooser = (
    <div className="flex flex-col gap-3">
      <h3 className="thai-font font-bold">เพิ่มเป้าหมาย</h3>
      <button type="button" onClick={() => setFlow({ type: 'search' })} className="px-card p-4 flex items-center gap-3 text-left bg-paper active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <Search size={28} className="text-brand-strong shrink-0" aria-hidden="true" />
        <span><span className="block thai-font font-bold text-sm">รู้แล้วว่าอยากเรียนอะไร</span><span className="block thai-font text-xs text-ink-soft">ค้นหาหรือเลือกมหาวิทยาลัย คณะ สาขา เหมือนใน MyTCAS</span></span>
      </button>
      <button type="button" onClick={() => setFlow({ type: 'advisor' })} className="px-card p-4 flex items-center gap-3 text-left bg-paper active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <Wand2 size={28} className="text-zone-arts-deep shrink-0" aria-hidden="true" />
        <span><span className="block thai-font font-bold text-sm">ยังไม่รู้ ให้พี่ช่วยเลือก</span><span className="block thai-font text-xs text-ink-soft">ตอบสั้นๆ แล้วพี่คัดคณะที่เหมาะให้ เหมาะกับคนที่เวลาไม่เยอะ</span></span>
      </button>
      <button type="button" onClick={() => setFlow(null)} className="self-start thai-font text-xs font-semibold text-brand-strong underline">ยกเลิก</button>
    </div>
  )

  let body
  if (flow) {
    body = flow.type === 'choose' ? chooser
      : flow.type === 'search' ? <ProgramPicker initial={flow.initial} onPick={pick} onCancel={() => setFlow({ type: 'choose' })} onStarter={(initial) => setFlow({ type: 'starter', initial })} />
      : flow.type === 'advisor' ? <Advisor onBack={() => setFlow({ type: 'choose' })} onChoose={(s) => setFlow({ type: 'search', initial: s })} />
      : <StarterPicker initial={flow.initial} onPick={pick} onBack={() => setFlow({ type: 'search' })} />
  }
  else if (tab === 'plan') body = <PlanTab onOpenApp={onOpenApp} onGoTo={(t) => { setTab(t); setMsg('') }} />
  else {
    body = goals.length === 0 ? (
      <div className="flex flex-col gap-4">
        <section className="px-card p-5 flex flex-col gap-2 bg-brand-soft text-center items-center" aria-label="เริ่มต้น">
          <Target size={40} className="text-brand-strong" aria-hidden="true" />
          <h3 className="font-display font-bold text-lg">ตั้งเป้าหมายแรกของคุณ</h3>
          <p className="thai-font text-sm text-ink-soft">เลือกคณะที่อยากเข้า แล้วพี่จะดึงคะแนนที่ต้องใช้และวางแผนอ่านหนังสือให้</p>
        </section>
        {chooser}
      </div>
    ) : (
      <div className="flex flex-col gap-4">
        {msg && <p role="status" className="px-card p-3 thai-font text-sm font-semibold bg-zone-earth-soft text-zone-earth-deep">{msg}</p>}
        <ul className="flex flex-col gap-3" aria-label="เป้าหมายของฉัน">
          {goals.map((g, i) => (
            <GoalCard
              key={g.id} goal={g} index={i} count={goals.length} primary={g.id === primaryGoalId}
              onPrimary={(id) => reorderGoals(id, goals[0].id)} onRemove={removeGoal}
              onMove={(id, dir) => { const to = goals[i + dir]; if (to) reorderGoals(id, to.id) }}
              dragId={dragId} setDragId={setDragId}
              onDropOn={(toId) => { if (dragId) reorderGoals(dragId, toId); setDragId(null) }}
            >
              <GoalSubjects goal={g} primary={g.id === primaryGoalId} />
            </GoalCard>
          ))}
        </ul>
        <button type="button" onClick={() => setFlow({ type: 'choose' })} disabled={full} className="px-btn py-2.5 thai-font text-sm font-bold bg-paper disabled:opacity-50 flex items-center justify-center gap-2">
          <Plus size={16} aria-hidden="true" /> {full ? `ครบ ${MAX_GOALS} เป้าหมายแล้ว` : `เพิ่มเป้าหมาย (${goals.length}/${MAX_GOALS})`}
        </button>
        <Recommended goals={goals} onOpenApp={onOpenApp} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col">
      {!flow && (
        <nav className="sticky top-0 z-10 bg-paper border-b-2 border-hairline px-3 pt-2" role="tablist" aria-label="เมนู Goal">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => { setTab(t.id); setMsg('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 thai-font text-sm font-bold rounded-t-ui border-b-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === t.id ? 'border-brand-strong text-brand-strong' : 'border-transparent text-ink-soft'}`}
              >
                <t.Icon size={16} aria-hidden="true" /> {t.label}
              </button>
            ))}
          </div>
        </nav>
      )}
      <div className="p-4 sm:p-6">{body}</div>
    </div>
  )
}
