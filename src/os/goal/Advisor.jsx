import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { suggestPrograms } from '../../services/aiAdvisor'
import { daysUntil } from '../studyPlan'
import { useLifeStore } from '../../stores/useLifeStore'
import { BackBar, PickRow, Loading } from './ui'

const INTERESTS = ['คอมพิวเตอร์/เทคโนโลยี', 'วาดรูป/ออกแบบ', 'สุขภาพ/การแพทย์', 'ธุรกิจ/การเงิน', 'ภาษา/สื่อสาร', 'วิทยาศาสตร์/ทดลอง', 'ครู/การศึกษา', 'กฎหมาย/สังคม']
const SUBJECTS = ['คณิตศาสตร์', 'ฟิสิกส์', 'เคมี', 'ชีววิทยา', 'ภาษาอังกฤษ', 'ภาษาไทย', 'สังคม', 'ศิลปะ']

function Chips({ options, value, onToggle, label }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o)}
            className={`px-btn px-3 py-1 thai-font text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${on ? 'bg-brand-strong text-white' : 'bg-paper'}`}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

// "ยังไม่รู้จะเรียนอะไร": two taps + an optional note → five suggestions. Tapping one opens the
// MyTCAS picker at that university so the goal always comes from official data.
export default function Advisor({ onBack, onChoose }) {
  const examDate = useLifeStore((s) => s.target.examDate)
  const [interests, setInterests] = useState([])
  const [subjects, setSubjects] = useState([])
  const [note, setNote] = useState('')
  const [state, setState] = useState({ status: 'form', list: [] })
  const toggle = (setter) => (v) => setter((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))

  async function run(e) {
    e.preventDefault()
    setState({ status: 'loading', list: [] })
    try {
      const list = await suggestPrograms({ interests, subjects, note, daysLeft: daysUntil(examDate) })
      setState({ status: list.length ? 'done' : 'empty', list })
    } catch (err) {
      console.error('[Advisor] suggest failed:', err)
      setState({ status: 'error', list: [] })
    }
  }

  const form = state.status === 'form' || state.status === 'error' || state.status === 'empty'
  return (
    <div className="flex flex-col gap-4">
      <BackBar onBack={onBack} title="ให้พี่ช่วยเลือกคณะ" sub="ตอบสั้นๆ แล้วพี่คัดให้ 5 ตัวเลือก" />
      {form && (
        <form onSubmit={run} className="flex flex-col gap-4">
          <section className="px-card p-4 flex flex-col gap-2" aria-label="ความสนใจ">
            <h4 className="thai-font font-bold text-sm">สนใจเรื่องไหน (เลือกได้หลายอัน)</h4>
            <Chips label="ความสนใจ" options={INTERESTS} value={interests} onToggle={toggle(setInterests)} />
          </section>
          <section className="px-card p-4 flex flex-col gap-2" aria-label="วิชาที่ถนัด">
            <h4 className="thai-font font-bold text-sm">วิชาที่ถนัด</h4>
            <Chips label="วิชาที่ถนัด" options={SUBJECTS} value={subjects} onToggle={toggle(setSubjects)} />
          </section>
          <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
            อยากบอกพี่เพิ่มไหม (ไม่บังคับ) เช่น อยู่ภาคไหน อยากเรียนที่ไหน
            <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} className="px-input h-10 px-3 text-sm text-ink bg-paper" />
          </label>
          {state.status === 'error' && <p role="alert" className="thai-font text-sm text-zone-health-deep">พี่ติดขัดนิดหน่อย ลองใหม่อีกครั้ง หรือกลับไปค้นหาเองก็ได้</p>}
          {state.status === 'empty' && <p role="alert" className="thai-font text-sm text-zone-health-deep">พี่ยังคัดไม่ได้ ลองเลือกความสนใจเพิ่ม</p>}
          <button type="submit" disabled={interests.length === 0 && subjects.length === 0 && !note.trim()} className="px-btn py-2.5 thai-font text-sm font-bold bg-brand-strong text-white disabled:opacity-50 flex items-center justify-center gap-2">
            <Sparkles size={16} aria-hidden="true" /> ให้พี่คัดให้
          </button>
        </form>
      )}
      {state.status === 'loading' && <Loading text="พี่กำลังคัดตัวเลือกให้..." />}
      {state.status === 'done' && (
        <section className="flex flex-col gap-2" aria-label="ตัวเลือกจากพี่">
          <p className="thai-font text-sm">พี่คัดให้ {state.list.length} ตัวเลือก กดเพื่อดูหลักสูตรจริงใน MyTCAS</p>
          {state.list.map((s, i) => (
            <PickRow
              key={`${s.university}-${s.faculty}-${i}`}
              title={`${s.program || s.faculty}`}
              sub={`${s.university} · ${s.faculty} — ${s.reason}`}
              onClick={() => onChoose(s)}
            />
          ))}
          <button type="button" onClick={() => setState({ status: 'form', list: [] })} className="self-start thai-font text-xs font-semibold text-brand-strong underline">ตอบใหม่</button>
        </section>
      )}
    </div>
  )
}
