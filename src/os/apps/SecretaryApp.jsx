import { useEffect, useRef, useState } from 'react'
import { Send, CalendarClock, ListChecks } from 'lucide-react'
import VoiceSecretaryPanel from '../../components/voice/VoiceSecretaryPanel'
import { useLifeStore } from '../../stores/useLifeStore'
import { todayKey } from '../lifeLogic'
import { daysUntil, planSuccess } from '../studyPlan'
import { effectiveExamDate } from '../goalLogic'
import { askSecretary, buildSecretaryContext } from '../../services/aiSecretary'

const QUICK = ['วันนี้ต้องทำอะไรบ้าง', 'ช่วยให้กำลังใจหน่อย', 'ตอนนี้ควรเน้นวิชาไหน']

// Secretary (เลขา AI พี่ใจดี): follows up on your plan, answers by text, and you can also call her.
export default function SecretaryApp() {
  const life = useLifeStore()
  const today = todayKey()
  const todays = life.tasks.filter((t) => t.date === today)
  const open = todays.filter((t) => !t.done)
  const left = daysUntil(effectiveExamDate(life.target, life.scores), today)
  const success = planSuccess(life.tasks, today)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef(null)

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [messages.length])

  async function ask(question) {
    const q = question.trim()
    if (!q || busy) return
    const history = messages
    setMessages((m) => [...m, { role: 'user', text: q }])
    setText('')
    setBusy(true)
    try {
      const answer = await askSecretary({ question: q, history, context: buildSecretaryContext(useLifeStore.getState(), todayKey()) })
      setMessages((m) => [...m, { role: 'ai', text: answer }])
    } catch (e) {
      console.error('[SecretaryApp] ask failed:', e)
      setMessages((m) => [...m, { role: 'ai', text: 'ขอโทษนะน้อง ตอนนี้พี่ติดขัดนิดหน่อย ลองใหม่อีกครั้งนะ' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <section className="px-card p-4 flex flex-col gap-2 bg-brand-soft" aria-label="พี่ตามงานให้">
        <h3 className="thai-font font-bold flex items-center gap-2"><ListChecks size={18} aria-hidden="true" /> พี่ตามงานให้</h3>
        <p className="thai-font text-sm flex items-center gap-2">
          <CalendarClock size={16} aria-hidden="true" />
          {left == null ? 'ยังไม่ได้ตั้งวันสอบ' : left >= 0 ? `เหลืออีก ${left} วันถึงวันสอบ` : 'ผ่านวันสอบแล้ว'} · ทำตามแผนได้ {success.percent}%
        </p>
        {todays.length === 0 ? (
          <p className="thai-font text-sm text-ink-soft">วันนี้ยังไม่มีงานในแผน ไปตั้งแผนที่ Goal หรือ Habit ได้เลย</p>
        ) : open.length === 0 ? (
          <p className="thai-font text-sm font-semibold">วันนี้ทำครบทุกอย่างแล้ว เก่งมากน้อง พักผ่อนได้</p>
        ) : (
          <>
            <p className="thai-font text-sm">ยังเหลือ {open.length} อย่างที่ยังไม่ได้ทำวันนี้:</p>
            <ul className="flex flex-col gap-1.5">
              {open.map((t) => (
                <li key={t.id} className="flex items-center gap-2 thai-font text-sm">
                  <input type="checkbox" checked={false} onChange={() => life.toggleTask(t.id)} aria-label={`ทำแล้ว: ${t.text}`} className="w-5 h-5 shrink-0" />
                  <span className="flex-1 min-w-0">{t.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="px-card p-4 flex flex-col gap-3" aria-label="คุยกับพี่ใจดี">
        <h3 className="thai-font font-bold">คุยกับพี่ใจดี (พิมพ์)</h3>
        <div className="h-64 overflow-y-auto flex flex-col gap-2" aria-live="polite">
          {messages.length === 0 && <p className="thai-font text-sm text-ink-soft">ถามพี่ได้เลย เช่น วันนี้ควรอ่านอะไร หรือรู้สึกท้อ</p>}
          {messages.map((m, i) => (
            <span
              key={i}
              className={`thai-font text-sm px-3 py-1.5 rounded-ui max-w-[85%] whitespace-pre-wrap break-words ${m.role === 'user' ? 'self-end bg-brand-strong text-white' : 'self-start bg-mist'}`}
            >
              {m.text}
            </span>
          ))}
          {busy && <span className="thai-font text-xs text-ink-soft self-start">พี่กำลังพิมพ์...</span>}
          <span ref={end} />
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button key={q} type="button" disabled={busy} onClick={() => ask(q)} className="px-btn px-3 py-1 thai-font text-xs font-bold bg-paper disabled:opacity-50">{q}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(text) }} className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} placeholder="พิมพ์ข้อความถึงพี่" aria-label="ข้อความถึงพี่ใจดี" className="px-input h-10 px-3 text-sm flex-1 min-w-0" />
          <button type="submit" disabled={busy || !text.trim()} aria-label="ส่ง" className="px-btn px-3 bg-brand-strong text-white disabled:opacity-50"><Send size={16} /></button>
        </form>
      </section>

      <VoiceSecretaryPanel />
    </div>
  )
}
