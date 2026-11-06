import { useState } from 'react'
import { Plus, X, Sparkles, CalendarClock } from 'lucide-react'
import { useLifeStore } from '../../stores/useLifeStore'
import { scoreGap } from '../lifeLogic'
import { daysUntil } from '../studyPlan'
import { findApp } from '../apps'
import { generateStudyPlan } from '../../services/aiStudyPlan'

const FIELDS = [
  ['university', 'มหาวิทยาลัย'],
  ['faculty', 'คณะ'],
  ['major', 'สาขา'],
]

// Goal: pick one target (university / faculty / major), the exam date and the scores it needs.
// Everything is saved to the user's account automatically. "วางแผนด้วย AI" builds the day-by-day plan
// and opens Habit.
export default function GoalApp({ onOpenApp }) {
  const { target, scores, hoursPerDay, setTarget, setHoursPerDay, addScore, setMyScore, removeScore, applyPlan } = useLifeStore()
  const [planning, setPlanning] = useState(false)
  const [planMsg, setPlanMsg] = useState('')
  const left = daysUntil(target.examDate)
  const canPlan = left != null && left >= 0 && scores.length > 0
  const [subject, setSubject] = useState('')
  const [needed, setNeeded] = useState('')
  const hasTarget = FIELDS.some(([k]) => target[k])

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

  function submit(e) {
    e.preventDefault()
    addScore(subject, needed)
    setSubject('')
    setNeeded('')
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <section className="px-card p-4 flex flex-col gap-3" aria-label="เป้าหมาย">
        <h3 className="thai-font font-bold">เป้าหมายของฉัน</h3>
        {FIELDS.map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
            {label}
            <input
              value={target[key]}
              onChange={(e) => setTarget({ [key]: e.target.value })}
              className="px-input h-10 px-3 text-sm text-ink bg-paper"
            />
          </label>
        ))}
        <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
          วันสอบ (TCAS รอบ 3)
          <input
            type="date"
            value={target.examDate}
            onChange={(e) => setTarget({ examDate: e.target.value })}
            className="px-input h-10 px-3 text-sm text-ink bg-paper"
          />
        </label>
        {left != null && (
          <p className="thai-font text-sm flex items-center gap-2 text-brand-strong font-semibold">
            <CalendarClock size={16} aria-hidden="true" />
            {left > 0 ? `เหลืออีก ${left} วัน` : left === 0 ? 'วันสอบคือวันนี้ สู้ๆ' : 'ผ่านวันสอบแล้ว'}
          </p>
        )}
        <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
          อ่านหนังสือวันละกี่ชั่วโมง
          <input
            type="number"
            min="0.5"
            max="12"
            step="0.5"
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(e.target.value)}
            className="px-input h-10 px-3 text-sm text-ink bg-paper w-28"
          />
        </label>
        {!hasTarget && (
          <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
            ยังไม่มีคณะ? ตอนนี้สนใจอะไรอยู่
            <input
              value={target.interest}
              onChange={(e) => setTarget({ interest: e.target.value })}
              placeholder="เช่น ชอบวาดรูป ชอบคอมพิวเตอร์"
              className="px-input h-10 px-3 text-sm text-ink bg-paper"
            />
          </label>
        )}
      </section>

      <section className="px-card p-4 flex flex-col gap-3" aria-label="คะแนนที่ต้องใช้">
        <h3 className="thai-font font-bold">คะแนนที่ต้องใช้</h3>
        {scores.length === 0 && <p className="thai-font text-sm text-ink-soft">เพิ่มวิชา เช่น TGAT, A-Level คณิต</p>}
        <ul className="flex flex-col gap-2">
          {scores.map((s) => {
            const gap = scoreGap(s.needed, s.mine)
            return (
              <li key={s.id} className="flex items-center gap-2 thai-font text-sm">
                <span className="flex-1 min-w-0 truncate">{s.subject} <span className="text-ink-soft">(ต้องใช้ {s.needed})</span></span>
                <input
                  type="number"
                  value={s.mine ?? ''}
                  onChange={(e) => setMyScore(s.id, e.target.value)}
                  placeholder="ฉันได้"
                  aria-label={`คะแนนของฉัน ${s.subject}`}
                  className="px-input h-9 w-20 px-2 text-sm"
                />
                <span className={`w-16 text-xs font-bold ${gap == null ? 'text-ink-soft' : gap > 0 ? 'text-zone-health-deep' : 'text-zone-earth-deep'}`}>
                  {gap == null ? '-' : gap > 0 ? `ขาด ${gap}` : 'ถึงแล้ว'}
                </span>
                <button type="button" onClick={() => removeScore(s.id)} aria-label={`ลบ ${s.subject}`} className="p-1">
                  <X size={16} />
                </button>
              </li>
            )
          })}
        </ul>
        <form onSubmit={submit} className="flex gap-2">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="วิชา" aria-label="วิชา" className="px-input h-10 px-3 text-sm flex-1 min-w-0" />
          <input type="number" value={needed} onChange={(e) => setNeeded(e.target.value)} placeholder="คะแนนที่ต้องใช้" aria-label="คะแนนที่ต้องใช้" className="px-input h-10 px-3 text-sm w-32" />
          <button type="submit" aria-label="เพิ่มวิชา" className="px-btn px-3 bg-paper"><Plus size={18} /></button>
        </form>
      </section>
      <section className="px-card p-4 flex flex-col gap-2" aria-label="วางแผน">
        <button
          type="button"
          onClick={plan}
          disabled={!canPlan || planning}
          className="px-btn py-2.5 thai-font text-sm font-bold bg-brand-strong text-white disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Sparkles size={16} aria-hidden="true" /> {planning ? 'พี่กำลังวางแผน...' : 'วางแผนด้วย AI'}
        </button>
        {!canPlan && <p className="thai-font text-xs text-ink-soft">ใส่วันสอบ (ที่ยังมาไม่ถึง) และเพิ่มวิชาอย่างน้อย 1 วิชาก่อน</p>}
        {planMsg && <p role="alert" className="thai-font text-sm text-zone-health-deep">{planMsg}</p>}
        <p className="thai-font text-xs text-ink-soft">ข้อมูลบันทึกในบัญชีของคุณอัตโนมัติ</p>
      </section>
    </div>
  )
}
