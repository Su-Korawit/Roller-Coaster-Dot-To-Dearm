import { useEffect, useRef, useState } from 'react'
import { Search, UserPlus, Check, Send, Trash2, Target } from 'lucide-react'
import { useSocialStore } from '../../stores/useSocialStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useLifeStore, selectRoomId } from '../../stores/useLifeStore'
import { useRoomChatStore, GENERAL_ROOM, MAX_CHAT_TEXT } from '../../stores/useRoomChatStore'
import { flushOsSync } from '../../lib/syncManager'
import { findApp } from '../apps'

const TABS = [
  { id: 'mine', label: 'ห้องของฉัน' },
  { id: 'general', label: 'ห้องรวม' },
  { id: 'people', label: 'หาเพื่อน' },
]

function formatTime(ts) {
  const ms = ts?.toMillis?.()
  return ms ? new Date(ms).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''
}

// Live chat of one room.
function Chat({ roomId, uid }) {
  const { messages, status, open, send, remove } = useRoomChatStore()
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const end = useRef(null)

  useEffect(() => { open(roomId) }, [roomId, open])
  useEffect(() => () => useRoomChatStore.getState().close(), [])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [messages.length])

  async function submit(e) {
    e.preventDefault()
    const out = await send(roomId, text)
    setErr(out ?? '')
    if (!out) setText('')
  }

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className="px-card p-3 h-80 overflow-y-auto flex flex-col gap-2" aria-live="polite">
        {status === 'loading' && <p className="thai-font text-sm text-ink-soft">กำลังโหลด...</p>}
        {status === 'denied' && (
          <p role="alert" className="thai-font text-sm text-zone-health-deep">
            เข้าห้องนี้ไม่ได้ ระบบกำลังบันทึกเป้าหมายของคุณ ลองสลับแท็บแล้วกลับมาใหม่
          </p>
        )}
        {status === 'error' && <p role="alert" className="thai-font text-sm text-zone-health-deep">โหลดข้อความไม่สำเร็จ</p>}
        {status === 'ready' && messages.length === 0 && (
          <p className="thai-font text-sm text-ink-soft text-center py-6">ยังไม่มีข้อความ ทักทายเพื่อนคนแรกเลย</p>
        )}
        {messages.map((m) => {
          const mine = m.uid === uid
          return (
            <div key={m.id} className={`flex flex-col max-w-[85%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
              <span className="thai-font text-xs text-ink-soft">{mine ? 'คุณ' : m.name} {formatTime(m.createdAt)}</span>
              <span className={`thai-font text-sm px-3 py-1.5 rounded-ui whitespace-pre-wrap break-words ${mine ? 'bg-brand-strong text-white' : 'bg-mist'}`}>
                {m.text}
              </span>
              {mine && (
                <button type="button" onClick={() => remove(roomId, m.id)} aria-label="ลบข้อความ" className="p-0.5 text-ink-soft">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )
        })}
        <span ref={end} />
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHAT_TEXT))}
          placeholder="พิมพ์ข้อความ"
          aria-label="ข้อความ"
          className="px-input h-10 px-3 text-sm flex-1 min-w-0"
        />
        <button type="submit" aria-label="ส่ง" disabled={!text.trim()} className="px-btn px-3 bg-brand-strong text-white disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
      {err && <p role="alert" className="thai-font text-sm text-zone-health-deep">{err}</p>}
    </div>
  )
}

// Find people by name or school and send a follow request.
function People() {
  const { searchResults, sentRequests, following, searchUsers, sendFollowRequest } = useSocialStore()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  async function run(term) {
    setError('')
    try { await searchUsers(term) } catch { setError('ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง') }
  }
  async function follow(targetUid) {
    setError('')
    try { await sendFollowRequest(targetUid) } catch { setError('ส่งคำขอไม่สำเร็จ ลองใหม่อีกครั้ง') }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={(e) => { e.preventDefault(); run(query) }} className="px-input flex items-center gap-2 px-3 h-11">
        <Search size={18} className="text-ink-soft shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อหรือโรงเรียน แล้วกด Enter"
          aria-label="ค้นหาผู้ใช้"
          className="thai-font text-sm flex-1 bg-transparent outline-none text-ink placeholder:text-ink-soft"
        />
      </form>
      {error && <p role="alert" className="thai-font text-sm text-zone-health-deep">{error}</p>}
      <ul className="flex flex-col gap-2">
        {searchResults.map((u) => {
          const status = following.includes(u.uid) ? 'following' : sentRequests.includes(u.uid) ? 'sent' : 'none'
          return (
            <li key={u.uid} className="px-card p-3 flex items-center gap-3 thai-font text-sm">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold truncate">{u.displayName || 'ผู้ใช้'}</span>
                {u.schoolName && <span className="block text-xs text-ink-soft truncate">{u.schoolName}</span>}
              </span>
              <button
                type="button"
                disabled={status !== 'none'}
                onClick={() => follow(u.uid)}
                className="px-btn px-3 py-1.5 text-xs font-bold bg-paper disabled:opacity-60 flex items-center gap-1"
              >
                {status === 'none' ? <><UserPlus size={14} />ติดตาม</> : <><Check size={14} />{status === 'following' ? 'ติดตามแล้ว' : 'ส่งคำขอแล้ว'}</>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Chat: chat with everyone who picked the same faculty + major (any university),
// an open room for everybody, and a people finder.
export default function ChatApp({ onOpenApp }) {
  const uid = useAuthStore((s) => s.user?.uid)
  const target = useLifeStore((s) => s.target)
  const roomId = useLifeStore(selectRoomId)
  const subscribeToRequests = useSocialStore((s) => s.subscribeToRequests)
  const [tab, setTab] = useState('mine')

  useEffect(() => {
    if (!uid) return undefined
    flushOsSync()   // make sure users/{uid}.osRoomId is saved before the room rules are checked
    const off = subscribeToRequests(uid)
    return () => { if (typeof off === 'function') off() }
  }, [uid, subscribeToRequests])

  if (!uid) return <p className="thai-font text-sm text-ink-soft p-6">เข้าสู่ระบบเพื่อใช้แชต</p>

  const label = [target.faculty, target.major].filter(Boolean).join(' / ')
  const goal = findApp('goal')

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <div role="tablist" className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-btn px-3 py-1.5 thai-font text-sm font-bold ${tab === t.id ? 'bg-brand-strong text-white' : 'bg-paper'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mine' && (roomId ? (
        <>
          <p className="thai-font text-sm px-card p-3 bg-brand-soft">
            ห้อง <b>{label}</b> — คุยกับทุกคนที่เลือกคณะ/สาขานี้ แม้อยู่คนละมหาวิทยาลัย
          </p>
          <Chat key={roomId} roomId={roomId} uid={uid} />
        </>
      ) : (
        <div className="px-card p-5 flex flex-col items-center gap-3 text-center">
          <p className="thai-font text-sm">ตั้งคณะและสาขาเป้าหมายในแอป Goal ก่อน แล้วจะเข้าห้องของคณะนั้นได้</p>
          {goal && onOpenApp && (
            <button type="button" onClick={() => onOpenApp(goal)} className="px-btn px-4 py-2 thai-font text-sm font-bold bg-paper flex items-center gap-2">
              <Target size={16} aria-hidden="true" /> เปิด Goal
            </button>
          )}
        </div>
      ))}

      {tab === 'general' && <Chat key={GENERAL_ROOM} roomId={GENERAL_ROOM} uid={uid} />}
      {tab === 'people' && <People />}
    </div>
  )
}
