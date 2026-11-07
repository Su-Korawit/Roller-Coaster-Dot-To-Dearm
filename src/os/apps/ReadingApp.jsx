import { useEffect, useRef, useState } from 'react'
import { Plus, X, Play, Square, Share2, Trophy } from 'lucide-react'
import { useLifeStore, selectRoomId } from '../../stores/useLifeStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useReadingTimerStore } from '../../stores/useReadingTimerStore'
import { useReadingBoardStore } from '../../stores/useReadingBoardStore'
import { useRoomChatStore } from '../../stores/useRoomChatStore'
import { flushOsSync } from '../../lib/syncManager'
import { readingProgress, todayKey } from '../lifeLogic'
import { thisWeekMinutes, sumMinutes, readingStreak, rankEntries, formatMinutes } from '../studyPlan'
import ProfileAvatar from '../ProfileAvatar'

const PRESETS = [25, 45, 60]

function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// Reading: a focus-reading room (timer + your avatar), solo stats, a group leaderboard for your
// faculty/major room, and a page tracker for your books. Minutes feed the Habit cards.
export default function ReadingApp() {
  const user = useAuthStore((s) => s.user)
  const { books, readLog, addBook, removeBook, setBookPage } = useLifeStore()
  const roomId = useLifeStore(selectRoomId)
  const { startedAt, plannedMin, start, finish, cancel } = useReadingTimerStore()
  const { entries, loading, error, load, publish } = useReadingBoardStore()
  const [board, setBoard] = useState('solo')
  const [msg, setMsg] = useState('')
  const [title, setTitle] = useState('')
  const [total, setTotal] = useState('')
  const now = useNow(startedAt != null)

  const running = startedAt != null
  const remaining = running ? startedAt + plannedMin * 60000 - now : plannedMin * 60000
  const today = todayKey()

  useEffect(() => { if (roomId && user) { flushOsSync(); load(roomId) } }, [roomId, user, load])

  async function stop() {
    const minutes = finish()
    if (!minutes) { setMsg('อ่านไม่ถึง 1 นาที ยังไม่นับเวลา'); return }
    const err = user ? await publish() : null
    setMsg(err ?? `บันทึกแล้ว อ่านไป ${minutes} นาที เก่งมาก`)
  }

  async function share() {
    if (!roomId) return
    const mins = readLog[today] || 0
    const err = await useRoomChatStore.getState().send(roomId, `วันนี้อ่านหนังสือไปแล้ว ${formatMinutes(mins)} มาอ่านด้วยกันนะ`)
    setMsg(err ?? 'แชร์ไปที่ห้องแล้ว')
  }

  // Auto-finish when the planned time is reached (checked once a second while a session runs).
  const stopRef = useRef(stop)
  useEffect(() => { stopRef.current = stop })
  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => {
      const t = useReadingTimerStore.getState()
      if (t.startedAt != null && Date.now() >= t.startedAt + t.plannedMin * 60000) stopRef.current()
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const rows = rankEntries(entries, today)
  const stats = [
    ['วันนี้', formatMinutes(readLog[today] || 0)],
    ['สัปดาห์นี้', formatMinutes(thisWeekMinutes(readLog, today))],
    ['ทั้งหมด', formatMinutes(sumMinutes(readLog))],
    ['อ่านต่อเนื่อง', `${readingStreak(readLog, today)} วัน`],
  ]

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <section className="px-card p-4 flex flex-col items-center gap-3" aria-label="ห้องอ่านหนังสือ" style={{ background: 'var(--color-zone-sci-soft)' }}>
        <div className={running ? 'os-bob' : ''}>
          {user && <ProfileAvatar user={user} size={88} />}
        </div>
        <p className="font-display font-bold text-4xl tabular-nums" role="timer" aria-live="off">{mmss(remaining)}</p>
        {running ? (
          <button type="button" onClick={stop} className="px-btn px-5 py-2 thai-font text-sm font-bold bg-paper flex items-center gap-2">
            <Square size={14} aria-hidden="true" /> หยุดและบันทึก
          </button>
        ) : (
          <>
            <div className="flex gap-2" role="radiogroup" aria-label="เวลาอ่าน">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={plannedMin === m}
                  onClick={() => useReadingTimerStore.setState({ plannedMin: m })}
                  className={`px-btn px-3 py-1 thai-font text-sm font-bold ${plannedMin === m ? 'bg-brand-strong text-white' : 'bg-paper'}`}
                >
                  {m} น.
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { setMsg(''); start(plannedMin) }} className="px-btn px-5 py-2 thai-font text-sm font-bold bg-brand-strong text-white flex items-center gap-2">
              <Play size={14} aria-hidden="true" /> เริ่มอ่าน
            </button>
          </>
        )}
        {running && <button type="button" onClick={cancel} className="thai-font text-xs text-ink-soft underline">ยกเลิก (ไม่นับเวลา)</button>}
        {msg && <p role="status" className="thai-font text-sm text-brand-strong">{msg}</p>}
      </section>

      <section className="px-card p-4 flex flex-col gap-3" aria-label="อันดับ">
        <div className="flex items-center gap-2">
          <Trophy size={18} aria-hidden="true" />
          <h3 className="thai-font font-bold flex-1">อันดับการอ่าน</h3>
          {['solo', 'group'].map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={board === b}
              onClick={() => setBoard(b)}
              className={`px-btn px-3 py-1 thai-font text-xs font-bold ${board === b ? 'bg-brand-strong text-white' : 'bg-paper'}`}
            >
              {b === 'solo' ? 'เดี่ยว' : 'กลุ่ม'}
            </button>
          ))}
        </div>

        {board === 'solo' && (
          <ul className="grid grid-cols-2 gap-2">
            {stats.map(([k, v]) => (
              <li key={k} className="px-card p-3 thai-font">
                <p className="text-xs text-ink-soft">{k}</p>
                <p className="font-bold">{v}</p>
              </li>
            ))}
          </ul>
        )}

        {board === 'group' && (roomId ? (
          <>
            {loading && <p className="thai-font text-sm text-ink-soft">กำลังโหลด...</p>}
            {error && <p role="alert" className="thai-font text-sm text-zone-health-deep">{error}</p>}
            {!loading && rows.length === 0 && <p className="thai-font text-sm text-ink-soft">ยังไม่มีใครในห้องนี้ เริ่มอ่านแล้วบันทึก คุณจะเป็นคนแรก</p>}
            <ol className="flex flex-col gap-1.5">
              {rows.map((r) => (
                <li key={r.uid} className={`flex items-center gap-3 thai-font text-sm px-3 py-2 rounded-ui ${r.uid === user?.uid ? 'bg-brand-soft font-bold' : 'bg-mist'}`}>
                  <span className="w-6 text-center">{r.rank}</span>
                  <span className="flex-1 min-w-0 truncate">{r.name}{r.uid === user?.uid ? ' (คุณ)' : ''}</span>
                  <span>{formatMinutes(r.minutes)}</span>
                </li>
              ))}
            </ol>
            <button type="button" onClick={share} className="px-btn px-3 py-1.5 thai-font text-xs font-bold bg-paper self-start flex items-center gap-1.5">
              <Share2 size={14} aria-hidden="true" /> แชร์ผลวันนี้ไปที่ห้อง
            </button>
          </>
        ) : (
          <p className="thai-font text-sm text-ink-soft">ตั้งคณะและสาขาใน Goal ก่อน แล้วจะเห็นอันดับของกลุ่มเดียวกัน</p>
        ))}
      </section>

      <section className="px-card p-4 flex flex-col gap-3" aria-label="หนังสือที่กำลังอ่าน">
        <h3 className="thai-font font-bold">หนังสือที่กำลังอ่าน</h3>
        {books.length === 0 && <p className="thai-font text-sm text-ink-soft">เพิ่มหนังสือหรือชีทเล่มแรกของคุณ</p>}
        <ul className="flex flex-col gap-4">
          {books.map((b) => {
            const pct = readingProgress(b.page, b.totalPages)
            return (
              <li key={b.id} className="flex flex-col gap-1.5 thai-font text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate font-semibold">{b.title}</span>
                  <span className="text-xs font-bold text-brand-strong">{pct}%</span>
                  <button type="button" onClick={() => removeBook(b.id)} aria-label={`ลบ ${b.title}`} className="p-1"><X size={16} /></button>
                </div>
                <div className="h-2.5 rounded-full bg-mist overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-soft">
                  อ่านถึงหน้า
                  <input type="number" value={b.page} onChange={(e) => setBookPage(b.id, e.target.value)} className="px-input h-8 w-20 px-2 text-sm text-ink" />
                  / {b.totalPages || '?'}
                </label>
              </li>
            )
          })}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); addBook(title, total); setTitle(''); setTotal('') }} className="flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่อหนังสือ" aria-label="ชื่อหนังสือ" className="px-input h-10 px-3 text-sm flex-1 min-w-0" />
          <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="จำนวนหน้า" aria-label="จำนวนหน้า" className="px-input h-10 px-3 text-sm w-28" />
          <button type="submit" aria-label="เพิ่มหนังสือ" className="px-btn px-3 bg-paper"><Plus size={18} /></button>
        </form>
      </section>
    </div>
  )
}
