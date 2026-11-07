import { useEffect, useRef, useState } from 'react'
import { Send, Home, MessageCircle, Phone, Check, Plus, History, Sparkles } from 'lucide-react'
import VoiceSecretaryPanel from '../../components/voice/VoiceSecretaryPanel'
import { useLifeStore } from '../../stores/useLifeStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useSecretaryStore } from '../../stores/useSecretaryStore'
import { todayKey } from '../lifeLogic'
import { daysUntil, planSuccess } from '../studyPlan'
import { effectiveExamDate } from '../goalLogic'
import { greeting, proactiveItems } from '../secretaryLogic'
import { findApp } from '../apps'
import { askSecretary, buildSecretaryContext } from '../../services/aiSecretary'
import { generateStudyPlan } from '../../services/aiStudyPlan'

const QUICK = ['วันนี้ต้องทำอะไรบ้าง', 'ช่วยให้กำลังใจหน่อย', 'ตอนนี้ควรเน้นวิชาไหน']
const TABS = [
  { id: 'home', label: 'หน้าแรก', Icon: Home },
  { id: 'chat', label: 'แชท', Icon: MessageCircle },
  { id: 'call', label: 'โทร', Icon: Phone },
]
const timeLabel = (ms) => new Date(ms).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Banner: greeting + one-line status. Art (optional) goes in /assets/os/banners/secretary-home.webp.
function Banner({ left, percent, goalLabel }) {
  const [artFailed, setArtFailed] = useState(false)
  return (
    <section
      className="px-card relative overflow-hidden text-white aspect-[8/3] min-h-[150px]"
      style={{ background: 'linear-gradient(110deg, var(--color-brand-strong) 45%, var(--color-zone-arts))' }}
      aria-label="สรุปจากพี่ใจดี"
    >
      {!artFailed && (
        <>
          <img src="/assets/os/banners/secretary-home.webp" alt="" draggable={false} onError={() => setArtFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg, var(--color-brand-strong) 0%, var(--color-brand-strong) 40%, transparent 80%)' }} aria-hidden="true" />
        </>
      )}
      <div className="relative h-full flex flex-col justify-center gap-1 p-5 max-w-[65%]">
        <h3 className="font-display font-bold text-xl sm:text-2xl leading-tight">{greeting(new Date().getHours())}</h3>
        <p className="thai-font text-sm opacity-95">
          {left == null ? 'ยังไม่ได้ตั้งวันสอบ' : left >= 0 ? `เหลืออีก ${left} วันถึงวันสอบ` : 'ผ่านวันสอบแล้ว'} · ทำตามแผนได้ {percent}%
        </p>
        {goalLabel && <p className="thai-font text-xs opacity-80 truncate">{goalLabel}</p>}
      </div>
    </section>
  )
}

function HomeTab({ onOpenApp }) {
  const life = useLifeStore()
  const { history, log } = useSecretaryStore()
  const today = todayKey()
  const left = daysUntil(effectiveExamDate(life.target, life.scores), today)
  const success = planSuccess(life.tasks, today)
  const [dismissed, setDismissed] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [quick, setQuick] = useState('')

  const items = proactiveItems({
    tasks: life.tasks, goals: life.goals, scores: life.scores, examDate: effectiveExamDate(life.target, life.scores), today, hour: new Date().getHours(),
  }).filter((i) => !dismissed.has(i.id))

  async function confirm(item) {
    setNote('')
    if (item.confirm.action === 'reschedule') {
      life.postponeOpenTasks(today)
      log('เลื่อนงานที่ยังไม่ได้ทำของวันนี้ไปพรุ่งนี้')
      setDismissed((d) => new Set(d).add(item.id))
    } else if (item.confirm.action === 'plan') {
      setBusy(true)
      try {
        const st = useLifeStore.getState()
        const out = await generateStudyPlan({ target: st.target, scores: st.scores, hoursPerDay: st.hoursPerDay })
        if (out.tasks.length === 0) { setNote('ยังสร้างตารางไม่ได้ ตรวจวันสอบและวิชาที่ Goal อีกครั้ง'); return }
        st.applyPlan(out.tasks, out.summary)
        log(`สร้างตารางอ่านหนังสือใหม่ให้ (${out.tasks.length} รายการ)`)
        setDismissed((d) => new Set(d).add(item.id))
      } catch (e) {
        console.error('[SecretaryApp] plan failed:', e)
        setNote('สร้างตารางไม่สำเร็จ ลองใหม่อีกครั้ง')
      } finally {
        setBusy(false)
      }
    }
  }

  function addQuick(e) {
    e.preventDefault()
    if (!quick.trim()) return
    life.addTask(quick, 'อื่นๆ', today)
    log(`จดงานให้: ${quick.trim()}`)
    setQuick('')
  }

  return (
    <div className="flex flex-col gap-5">
      <Banner left={left} percent={success.percent} goalLabel={[life.target.faculty, life.target.major].filter(Boolean).join(' / ')} />

      <section className="px-card p-4 flex flex-col gap-3 bg-brand-soft" aria-label="พี่ขอถามก่อน">
        <h3 className="thai-font font-bold flex items-center gap-2"><Sparkles size={18} aria-hidden="true" /> พี่ขอถามก่อน</h3>
        {items.length === 0 && <p className="thai-font text-sm text-ink-soft">ตอนนี้ไม่มีอะไรต้องถามน้อง พี่จะทักเมื่อมีเรื่องสำคัญ</p>}
        <ul className="flex flex-col gap-3">
          {items.map((i) => {
            const app = i.open ? findApp(i.open) : null
            return (
              <li key={i.id} className="px-card p-3 bg-paper flex flex-col gap-2">
                <p className="thai-font text-sm">{i.text}</p>
                <div className="flex gap-2 flex-wrap">
                  {i.confirm && (
                    <button type="button" disabled={busy} onClick={() => confirm(i)} className="px-btn px-3 py-1.5 thai-font text-xs font-bold bg-brand-strong text-white disabled:opacity-50 flex items-center gap-1.5">
                      <Check size={14} aria-hidden="true" /> {busy ? 'พี่กำลังทำ...' : i.confirm.label}
                    </button>
                  )}
                  {app && onOpenApp && (
                    <button type="button" onClick={() => onOpenApp(app)} className="px-btn px-3 py-1.5 thai-font text-xs font-bold bg-brand-strong text-white">เปิด {app.name}</button>
                  )}
                  {(i.confirm || app) && (
                    <button type="button" onClick={() => setDismissed((d) => new Set(d).add(i.id))} className="px-btn px-3 py-1.5 thai-font text-xs font-bold bg-paper">ไว้ก่อน</button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {note && <p role="alert" className="thai-font text-sm text-zone-health-deep">{note}</p>}
      </section>

      <section className="px-card p-4 flex flex-col gap-2" aria-label="ให้พี่จดงาน">
        <h3 className="thai-font font-bold">ให้พี่จดงานให้</h3>
        <form onSubmit={addQuick} className="flex gap-2">
          <input value={quick} onChange={(e) => setQuick(e.target.value.slice(0, 120))} placeholder="เช่น ส่งการบ้านฟิสิกส์พรุ่งนี้" aria-label="งานที่ให้พี่จด" className="px-input h-10 px-3 text-sm flex-1 min-w-0" />
          <button type="submit" disabled={!quick.trim()} aria-label="จดงาน" className="px-btn px-3 bg-paper disabled:opacity-50"><Plus size={18} /></button>
        </form>
        <p className="thai-font text-xs text-ink-soft">งานที่จดจะขึ้นเป็นรายการของวันนี้ใน Habit</p>
      </section>

      <section className="px-card p-4 flex flex-col gap-2" aria-label="ประวัติ">
        <div className="flex items-center gap-2">
          <h3 className="thai-font font-bold flex items-center gap-2 flex-1"><History size={18} aria-hidden="true" /> สิ่งที่พี่ทำให้</h3>
          {history.length > 0 && <button type="button" onClick={() => useSecretaryStore.getState().clear()} className="thai-font text-xs text-ink-soft underline">ล้าง</button>}
        </div>
        {history.length === 0 && <p className="thai-font text-sm text-ink-soft">ยังไม่มีประวัติ</p>}
        <ul className="flex flex-col gap-1.5">
          {history.map((h) => (
            <li key={h.id} className="thai-font text-sm flex gap-2">
              <span className="text-xs text-ink-soft shrink-0 w-24">{timeLabel(h.at)}</span>
              <span className="min-w-0 break-words">{h.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ChatTab() {
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
    <section className="px-card p-4 flex flex-col gap-3" aria-label="คุยกับพี่ใจดี">
      <h3 className="thai-font font-bold">คุยกับพี่ใจดี (พิมพ์)</h3>
      <div className="h-80 overflow-y-auto flex flex-col gap-2" aria-live="polite">
        {messages.length === 0 && <p className="thai-font text-sm text-ink-soft">ถามพี่ได้เลย เช่น วันนี้ควรอ่านอะไร หรือรู้สึกท้อ</p>}
        {messages.map((m, i) => (
          <span key={i} className={`thai-font text-sm px-3 py-1.5 rounded-ui max-w-[85%] whitespace-pre-wrap break-words ${m.role === 'user' ? 'self-end bg-brand-strong text-white' : 'self-start bg-mist'}`}>{m.text}</span>
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
  )
}

// Secretary (เลขา AI พี่ใจดี): a personal secretary. Home = banner, what she wants to ask first (each
// action needs your confirm), quick task notes, and a history of what she did. Chat and Call are
// separate tabs. The old phone-number / call-time form is gone from here.
export default function SecretaryApp({ onOpenApp }) {
  const uid = useAuthStore((s) => s.user?.uid)
  const [tab, setTab] = useState('home')

  useEffect(() => { if (uid) useSecretaryStore.getState().adoptUser(uid) }, [uid])

  return (
    <div className="max-w-2xl mx-auto flex flex-col">
      <nav className="sticky top-0 z-10 bg-paper border-b-2 border-hairline px-3 pt-2" role="tablist" aria-label="เมนู Secretary">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 thai-font text-sm font-bold rounded-t-ui border-b-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === t.id ? 'border-brand-strong text-brand-strong' : 'border-transparent text-ink-soft'}`}
            >
              <t.Icon size={16} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="p-4 sm:p-6">
        {tab === 'home' && <HomeTab onOpenApp={onOpenApp} />}
        {tab === 'chat' && <ChatTab />}
        {tab === 'call' && <VoiceSecretaryPanel hidePhone />}
      </div>
    </div>
  )
}
