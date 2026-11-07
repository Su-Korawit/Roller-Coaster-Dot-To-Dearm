import { useState } from 'react'
import { Plus, X, Share2, Users, Clock } from 'lucide-react'
import { useLifeStore, selectRoomId } from '../../stores/useLifeStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useRoomChatStore } from '../../stores/useRoomChatStore'
import { readingProgress, todayKey } from '../lifeLogic'
import { thisWeekMinutes, sumMinutes, readingStreak, formatMinutes } from '../studyPlan'
import { findApp } from '../apps'

// Reading: the study room from the original game (/home: your room, focus timer, trees) shown in the
// window (a same-origin frame, so its stores stay separate from the OS), your logged reading stats,
// a page tracker for your books, and a link to Community. The old timer/leaderboard card is gone.
export default function ReadingApp({ onOpenApp }) {
  const user = useAuthStore((s) => s.user)
  const { books, readLog, addBook, removeBook, setBookPage } = useLifeStore()
  const roomId = useLifeStore(selectRoomId)
  const [msg, setMsg] = useState('')
  const [title, setTitle] = useState('')
  const [total, setTotal] = useState('')
  const [roomRev, setRoomRev] = useState(0)
  const today = todayKey()

  async function share() {
    if (!roomId) return
    const mins = readLog[today] || 0
    const err = await useRoomChatStore.getState().send(roomId, `วันนี้อ่านหนังสือไปแล้ว ${formatMinutes(mins)} มาอ่านด้วยกันนะ`)
    setMsg(err ?? 'แชร์ไปที่ห้องแล้ว')
  }

  const stats = [
    ['วันนี้', formatMinutes(readLog[today] || 0)],
    ['สัปดาห์นี้', formatMinutes(thisWeekMinutes(readLog, today))],
    ['ทั้งหมด', formatMinutes(sumMinutes(readLog))],
    ['อ่านต่อเนื่อง', `${readingStreak(readLog, today)} วัน`],
  ]
  const community = findApp('community')

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <section className="px-card overflow-hidden flex flex-col" aria-label="ห้องอ่านหนังสือ">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b-2 border-hairline bg-paper">
          <h3 className="thai-font font-bold text-sm flex-1">ห้องอ่านหนังสือของคุณ</h3>
          <button type="button" onClick={() => setRoomRev((r) => r + 1)} className="thai-font text-xs font-semibold text-brand-strong underline">โหลดห้องใหม่</button>
          <a href="/home" target="_blank" rel="noopener noreferrer" className="thai-font text-xs font-semibold text-brand-strong underline">เปิดเต็มจอ</a>
        </div>
        {user ? (
          <iframe key={roomRev} src="/home" title="ห้องอ่านหนังสือ" className="w-full h-[62vh] min-h-[380px] border-0 bg-mist" />
        ) : (
          <p className="thai-font text-sm text-ink-soft p-6">เข้าสู่ระบบเพื่อเข้าห้องอ่านหนังสือ</p>
        )}
      </section>

      <section className="px-card p-4 flex flex-col gap-3" aria-label="เวลาอ่านของฉัน">
        <div className="flex items-center gap-2">
          <Clock size={18} aria-hidden="true" />
          <h3 className="thai-font font-bold flex-1">เวลาอ่านของฉัน</h3>
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {stats.map(([k, v]) => (
            <li key={k} className="px-card p-3 thai-font">
              <p className="text-xs text-ink-soft">{k}</p>
              <p className="font-bold">{v}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {roomId && (
            <button type="button" onClick={share} className="px-btn px-3 py-1.5 thai-font text-xs font-bold bg-paper flex items-center gap-1.5">
              <Share2 size={14} aria-hidden="true" /> แชร์ผลวันนี้ไปที่ห้องคณะ
            </button>
          )}
          {community && onOpenApp && (
            <button type="button" onClick={() => onOpenApp(community)} className="px-btn px-3 py-1.5 thai-font text-xs font-bold bg-paper flex items-center gap-1.5">
              <Users size={14} aria-hidden="true" /> เปิด Community
            </button>
          )}
        </div>
        {!roomId && <p className="thai-font text-xs text-ink-soft">ตั้งคณะและสาขาใน Goal ก่อน จึงแชร์ไปห้องคณะได้</p>}
        {msg && <p role="status" className="thai-font text-sm text-brand-strong">{msg}</p>}
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
