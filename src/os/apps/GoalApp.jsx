import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useLifeStore } from '../../stores/useLifeStore'
import { scoreGap } from '../lifeLogic'

const FIELDS = [
  ['university', 'มหาวิทยาลัย'],
  ['faculty', 'คณะ'],
  ['major', 'สาขา'],
]

// Goal: pick one target (university / faculty / major) and list the scores it needs.
export default function GoalApp() {
  const { target, scores, setTarget, addScore, setMyScore, removeScore } = useLifeStore()
  const [subject, setSubject] = useState('')
  const [needed, setNeeded] = useState('')
  const hasTarget = FIELDS.some(([k]) => target[k])

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
    </div>
  )
}
