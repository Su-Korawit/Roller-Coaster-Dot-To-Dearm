import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Calendar, ClipboardList, Gamepad2, Gift, Home, Loader2, Send, Wrench, X } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'
import { useChatStore } from '../stores/useChatStore'
import { buildChatId, shapes } from '../lib/db'
import { ADMIN_UID, ADMIN_DISPLAY_NAME, ADMIN_EMAIL } from '../constants/admin'
import { useSocialStore } from '../stores/useSocialStore'
import { useUserStore } from '../stores/useUserStore'
import { mbtiColor } from '../constants/mbtiColors'
import { Z_SHEET } from '../constants/zIndex'
import ShopChatView from './shop/ShopChatView'
import { visitMap } from '../lib/syncManager'
import { useChatComposer } from '../hooks/useChatComposer'

const GIFTS = [
  { emoji: '🌟', name: 'Star',   coins: 10 },
  { emoji: '💎', name: 'Gem',    coins: 30 },
  { emoji: '🚀', name: 'Rocket', coins: 50 },
]

function fmtTime(ts) {
  if (!ts) return ''
  const date = ts?.toDate ? ts.toDate() : new Date(ts)
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMins < 1) return 'เมื่อกี้'
  if (diffMins < 60) return `${diffMins}m`
  const diffH = Math.floor(diffMins / 60)
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH / 24)}d`
}

// ─── GiftModal ────────────────────────────────────────────────────────────────
function GiftModal({ chatId, myUid, onClose }) {
  const coins = useUserStore((s) => s.coins)
  const addCoins = useUserStore((s) => s.addCoins)
  const [busy, setBusy] = useState(null)

  async function handleGift(gift) {
    if (coins < gift.coins || busy) return
    setBusy(gift.name)
    // Optimistic deduct — roll back on error
    addCoins(-gift.coins)
    try {
      await useChatStore.getState().sendGift(chatId, myUid, gift)
      onClose()
    } catch {
      addCoins(gift.coins) // rollback
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="absolute inset-0 flex items-end" style={{ zIndex: Z_SHEET }} onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl shadow-hard-sm pb-6 md:max-w-lg md:mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 bg-ink rounded-full" />
        </div>
        <p className="pixel-font text-[10px] text-center text-ink mb-1">🎁 Virtual Gift</p>
        <p className="pixel-font text-[7px] text-center text-ink-soft mb-5">
          {coins}
          <span className="inline-block ml-1 w-3.5 h-3.5 rounded-full border border-warn text-center text-[7px] leading-[13px] text-warn">$</span>
          &nbsp;remaining
        </p>
        <div className="grid grid-cols-3 gap-3 px-5">
          {GIFTS.map((g) => {
            const canAfford = coins >= g.coins
            return (
              <button
                key={g.name}
                onClick={() => handleGift(g)}
                disabled={!canAfford || !!busy}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                  canAfford
                    ? 'border-brand/30 bg-brand-soft hover:border-brand'
                    : 'border-ink/10 bg-paper opacity-40'
                }`}
              >
                {busy === g.name
                  ? <Loader2 size={24} className="animate-spin text-brand" />
                  : <span className="text-3xl">{g.emoji}</span>}
                <span className="pixel-font text-[7px] text-ink">{g.name}</span>
                <span className="pixel-font text-[10px] text-warn">{g.coins} $</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Credit helpers (localStorage) ───────────────────────────────────────────
function getCreditedTasks() {
  try { return JSON.parse(localStorage.getItem('rc-credited-tasks') || '[]') } catch { return [] }
}
function markTaskCredited(taskId) {
  const list = getCreditedTasks()
  if (!list.includes(taskId)) localStorage.setItem('rc-credited-tasks', JSON.stringify([...list, taskId]))
}

// ─── CreditModal ──────────────────────────────────────────────────────────────
function CreditModal({ msg, friendUser, onDone, onClose }) {
  const user = useAuthStore((s) => s.user)
  const addCreditToJourney = useUserStore((s) => s.addCreditToJourney)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const snap = msg?.taskSnapshot ?? {}

  async function handleConfirm() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const today = new Date().toISOString().slice(0, 10)
      const creditNote = {
        date: today,
        note: `ทำร่วมกับ ${friendUser?.displayName ?? 'เพื่อน'}${note.trim() ? `: ${note.trim()}` : ''}`,
        creditedFriend: {
          uid: friendUser?.uid ?? '',
          displayName: friendUser?.displayName ?? '',
          photoURL: friendUser?.photoURL ?? null,
        },
        taskTitle: snap.title,
      }
      if (snap.linkedJourneyKey && snap.linkedJourneyId) {
        addCreditToJourney(snap.linkedJourneyKey, snap.linkedJourneyId, creditNote)
      }
      await useChatStore.getState().giveCredit(friendUser?.uid, user, snap, note)
      markTaskCredited(snap.taskId)
      onDone(snap.taskId)
    } catch (e) {
      console.error('[Credit]', e)
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setBusy(false)
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col justify-end" style={{ zIndex: Z_SHEET }} onClick={onClose}>
      <div
        className="relative bg-white rounded-t-3xl shadow-hard-sm px-5 pb-6 pt-4 md:max-w-lg md:mx-auto md:w-full"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-ink rounded-full" />
        </div>
        <p className="thai-font text-sm text-ink text-center mb-1 font-semibold">🏅 ให้ Credit เพื่อน</p>
        <p className="text-center text-ink-soft mb-4 text-[11px]" style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
          ให้ Credit แก่ <strong>{friendUser?.displayName ?? 'เพื่อน'}</strong> สำหรับ "{snap.title}"?
        </p>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เขียนข้อความขอบคุณ (optional)..."
          className="w-full rounded-xl border border-ink/10 px-4 py-3 outline-none focus:border-brand resize-none mb-3"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 13 }}
          disabled={busy}
        />
        {error && <p className="pixel-font text-[7px] text-danger text-center mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-brand-soft text-ink-soft pixel-font text-[8px] active:scale-95 transition-transform"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-warn text-white pixel-font text-[8px] active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-1"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : '🏅 ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ChatWindowView ───────────────────────────────────────────────────────────
function ChatWindowView({ user, onBack, onAdminContacted, onVisitMap }) {
  const activeChat = useChatStore((s) => s.activeChat)
  const messages = useChatStore((s) => s.messages)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const subscribeMessages = useChatStore((s) => s.subscribeMessages)
  const chats = useChatStore((s) => s.chats)

  const { chatId, otherUser } = activeChat ?? {}
  const chatDoc = chats.find((c) => c.id === chatId)
  const fireStacks = chatDoc?.fireStacks ?? 0
  const isAdminChat = otherUser?.isAdmin === true || chatDoc?.isAdminChat === true

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showGift, setShowGift] = useState(false)
  const [creditTarget, setCreditTarget] = useState(null)
  const [creditedTaskIds, setCreditedTaskIds] = useState(() => getCreditedTasks())
  const bottomRef = useRef(null)

  // Fire-stacks pop animation
  const prevStacksRef = useRef(fireStacks)
  const [stackAnimating, setStackAnimating] = useState(false)
  useEffect(() => {
    if (fireStacks > prevStacksRef.current) {
      setStackAnimating(true)
      const id = setTimeout(() => setStackAnimating(false), 350)
      prevStacksRef.current = fireStacks
      return () => clearTimeout(id)
    }
    prevStacksRef.current = fireStacks
  }, [fireStacks])

  // Subscribe to messages for this chat
  useEffect(() => {
    if (!chatId) return
    const unsub = subscribeMessages(chatId)
    return () => unsub()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId])

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!text.trim() || sending) return
    const draft = text
    setText('')
    setSending(true)
    try {
      await sendMessage(chatId, draft)
      if (isAdminChat) onAdminContacted?.()
    } finally { setSending(false) }
  }

  const { textareaRef, handleKeyDown } = useChatComposer(text, handleSend)

  if (!activeChat) return null

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-ink/10 bg-white shrink-0">
        <button onClick={onBack} className="active:scale-90 transition-transform text-ink-soft shrink-0">
          <ArrowLeft size={18} />
        </button>
        {/* Avatar */}
        {isAdminChat ? (
          <div
            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #a78bda, #7c3aed)' }}
          >
            <Wrench size={15} className="text-white" />
          </div>
        ) : (
          <div
            className="w-9 h-9 rounded-full overflow-hidden bg-brand-soft shrink-0 border-2 flex items-center justify-center"
            style={{ borderColor: mbtiColor(shapes.readProfile(otherUser).mbti) }}
          >
            {otherUser?.photoURL
              ? <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
              : <Gamepad2 size={16} strokeWidth={2.5} className="text-ink" aria-hidden="true" />}
          </div>
        )}
        {/* Name */}
        <div className="flex-1 min-w-0">
          {isAdminChat ? (
            <>
              <div className="flex items-center gap-1.5">
                <p className="pixel-font text-[9px] text-ink truncate">{ADMIN_DISPLAY_NAME}</p>
                <span className="pixel-font text-[5px] px-1.5 py-0.5 rounded-full bg-good/10 text-good shrink-0">Admin</span>
              </div>
              <p className="pixel-font text-[6px] text-ink-soft mt-0.5">{ADMIN_EMAIL}</p>
            </>
          ) : (
            <>
              <p className="pixel-font text-[9px] text-ink truncate">
                {otherUser?.displayName || '...'}
              </p>
              {shapes.readProfile(otherUser).mbti && (
                <span
                  className="pixel-font text-[6px] px-1.5 py-0.5 rounded-md text-white inline-block mt-0.5"
                  style={{ background: mbtiColor(shapes.readProfile(otherUser).mbti) }}
                >
                  {shapes.readProfile(otherUser).mbti}
                </span>
              )}
            </>
          )}
        </div>
        {/* Fire stacks badge — hidden for admin chats */}
        {!isAdminChat && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-warn/10 border border-warn/20 shrink-0 ${
              stackAnimating ? 'animate-stack-pop' : ''
            }`}
          >
            <span className="text-sm leading-none">🔥</span>
            <span className="pixel-font text-[9px] text-warn">{fireStacks}</span>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          isAdminChat ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
              <div className="bg-paper border border-ink/10 rounded-2xl p-5 text-center max-w-70">
                <p className="text-3xl mb-3">👋</p>
                <p
                  className="text-ink-soft leading-relaxed"
                  style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 13 }}
                >
                  สวัสดีครับ/ค่ะ<br />
                  ติดต่อสอบถามหรือแจ้งปัญหา<br />
                  เกี่ยวกับ I LOVE TCAS<br />
                  ได้เลยครับ
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 opacity-50">
              <span className="text-4xl">💬</span>
              <p className="pixel-font text-[7px] text-ink-soft text-center leading-relaxed">
                เริ่มการสนทนาเลย!
              </p>
            </div>
          )
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid
          const isCard = msg.type === 'news' || msg.type === 'shared_task'
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[76%] rounded-2xl  overflow-hidden ${isCard ? '' : 'px-3.5 py-2.5'} ${
                  msg.type === 'shared_task'
                    ? 'bg-ink border border-brand/40'
                    : isMe
                      ? 'bg-brand text-white rounded-br-sm'
                      : 'bg-brand-soft text-ink rounded-bl-sm'
                }`}
                style={msg.type === 'shared_task' ? { borderLeft: '3px solid #a78bda' } : {}}
              >
                {msg.type === 'gift' ? (
                  <div className="flex flex-col items-center gap-1 py-0.5 px-2">
                    <span className="text-2xl leading-none">{msg.giftItem?.emoji ?? '🎁'}</span>
                    <span className={`pixel-font text-[7px] ${isMe ? 'text-brand-soft' : 'text-ink-soft'}`}>
                      {msg.giftItem?.name}
                    </span>
                    <span className={`pixel-font text-[6px] ${isMe ? 'text-brand-soft' : 'text-ink-soft'}`}>
                      {msg.giftItem?.coins} coins
                    </span>
                  </div>

                ) : msg.type === 'news' ? (
                  <div className="flex flex-col w-48">
                    {msg.newsItem?.thumbnail && (
                      <img src={msg.newsItem.thumbnail} alt={msg.newsItem.title} className="w-full h-24 object-cover" />
                    )}
                    <div className="px-3 py-2">
                      <p className={`pixel-font text-[6px] mb-1 ${isMe ? 'text-brand-soft' : 'text-ink-soft'}`}>📰 CAMPHUB</p>
                      <p className={`text-[11px] font-semibold leading-snug mb-2 ${isMe ? 'text-white' : 'text-ink'}`}
                        style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
                        {msg.newsItem?.title}
                      </p>
                      <button
                        onClick={() => window.open(msg.newsItem?.url, '_blank', 'noopener,noreferrer')}
                        className={`pixel-font text-[6px] px-2 py-1 rounded-lg active:scale-95 transition-transform ${
                          isMe ? 'bg-white/20 text-white' : 'bg-white text-brand border border-brand/20'
                        }`}
                      >อ่านต่อ →</button>
                    </div>
                    <p className={`pixel-font text-[5px] px-3 pb-2 ${isMe ? 'text-right text-brand-soft' : 'text-ink-soft'}`}>
                      {fmtTime(msg.createdAt)}
                    </p>
                  </div>

                ) : msg.type === 'shared_task' ? (() => {
                  const snap = msg.taskSnapshot ?? {}
                  const isCompleted = snap.status === 'completed'
                  const isOwner = user?.uid === snap.ownerUid
                  const alreadyCredited = creditedTaskIds.includes(snap.taskId)
                  const showCredit = isOwner && isCompleted && !alreadyCredited
                  return (
                    <div className="flex flex-col w-52">
                      {/* Header row */}
                      <div className="flex items-start gap-2 px-3 pt-3 pb-2 border-b border-brand/20">
                        <ClipboardList size={18} strokeWidth={1.5} className="shrink-0 text-brand" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <p className="thai-font text-[10px] text-brand mb-0.5">Task ของ {snap.ownerName}</p>
                          <p className="text-[12px] font-semibold text-white leading-snug"
                            style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
                            {snap.title}
                          </p>
                        </div>
                      </div>
                      {/* Status + badges */}
                      <div className="px-3 py-2 flex flex-col gap-1.5">
                        <span className={`pixel-font text-[7px] ${isCompleted ? 'text-good' : 'text-ink-soft'}`}>
                          {isCompleted ? '✅ เสร็จแล้ว' : '⏳ กำลังทำอยู่'}
                        </span>
                        {snap.linkedJourneyKey && (
                          <span className="pixel-font text-[6px] px-1.5 py-0.5 rounded bg-brand/20 text-[#c4a4f0] self-start">
                            {snap.linkedJourneyKey}
                          </span>
                        )}
                        {showCredit && (
                          <button
                            onClick={() => setCreditTarget(msg)}
                            className="mt-0.5 w-full pixel-font text-[7px] py-1.5 rounded-lg bg-warn text-white active:scale-95 transition-transform"
                          >
                            🏅 ให้ Credit เพื่อน
                          </button>
                        )}
                      </div>
                      <p className="pixel-font text-[5px] text-right text-ink-soft px-3 pb-2">
                        {fmtTime(msg.createdAt)}
                      </p>
                    </div>
                  )
                })() : (
                  <p style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 13, lineHeight: 1.55 }}>
                    {msg.text}
                  </p>
                )}

                {!isCard && (
                  <p className={`pixel-font text-[5px] mt-1 ${isMe ? 'text-right text-brand-soft' : 'text-ink-soft'}`}>
                    {fmtTime(msg.createdAt)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 border-t border-ink/10 bg-white px-3 py-2.5 flex items-center gap-2">
        <button
          onClick={() => setShowGift(true)}
          className="w-9 h-9 rounded-xl bg-warn/10 border border-warn/20 flex items-center justify-center active:scale-90 transition-transform shrink-0"
          title="ส่งของขวัญ"
        >
          <Gift size={18} strokeWidth={2.5} className="text-warn" aria-hidden="true" />
        </button>
        {!isAdminChat && otherUser?.uid && (
          <button
            onClick={() => onVisitMap?.(otherUser.uid)}
            className="w-9 h-9 rounded-xl bg-brand-soft border border-brand/20 flex items-center justify-center active:scale-90 transition-transform shrink-0"
            title={`เข้าแมพ ${otherUser.displayName || ''}`}
          >
            <Home size={18} strokeWidth={2.5} className="text-brand-strong" aria-hidden="true" />
          </button>
        )}
        <button
          onClick={() => alert('นัดหมาย — เร็วๆ นี้!')}
          className="w-9 h-9 rounded-xl bg-brand-soft border border-brand/20 flex items-center justify-center active:scale-90 transition-transform shrink-0"
          title="นัดหมาย"
        >
          <Calendar size={18} strokeWidth={2.5} className="text-brand-strong" aria-hidden="true" />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 bg-paper rounded-xl px-3 py-2 outline-none border border-ink/10 focus:border-brand transition-colors resize-none leading-relaxed"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 13, maxHeight: 120, overflowY: 'auto' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50 shrink-0 "
        >
          {sending
            ? <Loader2 size={14} className="text-white animate-spin" />
            : <Send size={14} className="text-white" />}
        </button>
      </div>

      {/* Gift modal */}
      {showGift && (
        <GiftModal chatId={chatId} myUid={user?.uid} onClose={() => setShowGift(false)} />
      )}

      {/* Credit modal */}
      {creditTarget && (
        <CreditModal
          msg={creditTarget}
          friendUser={activeChat?.otherUser}
          onDone={(taskId) => { setCreditedTaskIds((p) => [...p, taskId]); setCreditTarget(null) }}
          onClose={() => setCreditTarget(null)}
        />
      )}
    </div>
  )
}

// ─── ChatListView ─────────────────────────────────────────────────────────────
// Receives mutualUids (all friends) + chats (existing docs) separately so it
// can show every mutual follow even before the first message is sent.
function ChatListView({ user, participants, mutualUids, chats, onSelectFriend, adminChat, onOpenAdminChat, onOpenShop, isCurrentUserAdmin, loading }) {
  const [chatTab, setChatTab] = useState('friends')
  const totalStacks = chats.reduce((sum, c) => sum + (c.fireStacks ?? 0), 0)

  const CHAT_TABS = [
    { id: 'friends', label: 'Friends' },
    { id: 'school',  label: 'School'  },
    { id: 'world',   label: 'World'   },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10 shrink-0">
        <h2 className="pixel-font text-[12px] text-ink">Messages</h2>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-warn/10 border border-warn/20">
          <span className="text-sm leading-none">🔥</span>
          <span className="pixel-font text-[9px] text-warn">{totalStacks}</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-ink/10 bg-white shrink-0">
        {CHAT_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setChatTab(id)}
            className={`flex-1 py-2.5 pixel-font text-[7px] transition-colors border-b-2 ${
              chatTab === id
                ? 'text-brand border-brand'
                : 'text-ink-soft border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {chatTab !== 'friends' ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-60">
          <span className="text-3xl">{chatTab === 'school' ? '🏫' : '🌏'}</span>
          <p className="pixel-font text-[8px] text-ink-soft">Coming Soon</p>
        </div>
      ) : (
        /* ── Friends tab: Shop row (everyone) above the admin/regular split ── */
        <div className="flex-1 overflow-y-auto">
          {/* Shop AI row — visible to all users including the admin */}
          <button
            onClick={onOpenShop}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-warn/10 hover:bg-warn/10 active:bg-warn/10 transition-colors text-left"
          >
            <div
              className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-2xl"
              style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)' }}
            >
              🛒
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="pixel-font text-[9px] text-ink truncate">ร้านค้า AI</p>
                <span className="pixel-font text-[5px] px-1.5 py-0.5 rounded-full bg-warn/10 text-warn shrink-0">Shop</span>
              </div>
              <p className="text-ink-soft truncate mt-0.5" style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}>
                ซื้อเหรียญผ่าน PromptPay
              </p>
            </div>
          </button>

          {isCurrentUserAdmin ? (
        /* ── Admin view: show all user conversations ── */
        <>
          {loading && (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  data-testid="chat-list-skeleton"
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-ink/10 animate-pulse"
                >
                  <div className="w-11 h-11 rounded-full bg-brand-soft/60 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-3 bg-brand-soft/60 rounded w-1/3" />
                    <div className="h-3 bg-brand-soft rounded w-2/3" />
                  </div>
                </div>
              ))}
            </>
          )}
          {!loading && chats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-60">
              <span className="text-4xl">📩</span>
              <p className="thai-font text-xs text-ink-soft text-center">ยังไม่มีข้อความจากผู้ใช้</p>
            </div>
          )}
          {!loading && chats.map((chat) => {
            const otherUid = chat.members?.find((uid) => uid !== user.uid)
            if (!otherUid) return null
            const other = participants[otherUid]
            return (
              <button
                key={chat.id}
                onClick={() => onSelectFriend(otherUid)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-ink/10 hover:bg-paper active:bg-brand-soft transition-colors text-left"
              >
                <div
                  className="w-11 h-11 rounded-full overflow-hidden bg-brand-soft shrink-0 border-2 flex items-center justify-center"
                  style={{ borderColor: mbtiColor(shapes.readProfile(other).mbti) }}
                >
                  {other?.photoURL
                    ? <img src={other.photoURL} alt="" className="w-full h-full object-cover" />
                    : <Gamepad2 size={18} strokeWidth={2.5} className="text-ink" aria-hidden="true" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="pixel-font text-[9px] text-ink truncate">
                    {other?.displayName ?? otherUid.slice(0, 8) + '…'}
                  </p>
                  <p className="text-ink-soft truncate mt-0.5" style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}>
                    {chat.lastMessage || 'ส่งข้อความแล้ว'}
                  </p>
                </div>
                {chat.lastMessageAt && (
                  <span className="pixel-font text-[6px] text-ink-soft shrink-0">{fmtTime(chat.lastMessageAt)}</span>
                )}
              </button>
            )
          })}
        </>
      ) : (
        /* ── Regular user view: admin row at top + mutual friends ── */
        <>
          {/* Admin contact row — always visible */}
          <button
            onClick={onOpenAdminChat}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-brand/10 hover:bg-brand-soft active:bg-brand-soft transition-colors text-left"
          >
            <div
              className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #a78bda, #7c3aed)' }}
            >
              <Wrench size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="pixel-font text-[9px] text-ink truncate">{ADMIN_DISPLAY_NAME}</p>
                <span className="pixel-font text-[5px] px-1.5 py-0.5 rounded-full bg-good/10 text-good shrink-0">Admin</span>
              </div>
              <p className="text-ink-soft truncate mt-0.5" style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}>
                {adminChat?.lastMessage || 'ติดต่อสอบถาม / แจ้งปัญหา'}
              </p>
            </div>
            {adminChat?.lastMessageAt && (
              <span className="pixel-font text-[6px] text-ink-soft shrink-0">{fmtTime(adminChat.lastMessageAt)}</span>
            )}
          </button>

          {/* Mutual friends */}
          {loading && (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  data-testid="chat-list-skeleton"
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-ink/10 animate-pulse"
                >
                  <div className="w-11 h-11 rounded-full bg-brand-soft/60 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-3 bg-brand-soft/60 rounded w-1/3" />
                    <div className="h-3 bg-brand-soft rounded w-2/3" />
                  </div>
                </div>
              ))}
            </>
          )}
          {!loading && mutualUids.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
              <span className="text-4xl">👥</span>
              <p className="pixel-font text-[8px] text-ink-soft text-center leading-relaxed">
                ยังไม่มีเพื่อนที่ติดตามกัน
              </p>
              <p className="pixel-font text-[6px] text-ink-soft/50 text-center leading-relaxed mt-1">
                ไปติดตามเพื่อนใน Social ก่อนนะ
              </p>
            </div>
          )}
          {!loading && mutualUids.map((uid) => {
            const other = participants[uid]
            const chat = chats.find((c) => c.members?.includes(uid))
            return (
              <button
                key={uid}
                onClick={() => onSelectFriend(uid)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-ink/10 hover:bg-paper active:bg-brand-soft transition-colors text-left"
              >
                <div
                  className="w-11 h-11 rounded-full overflow-hidden bg-brand-soft shrink-0 border-2 flex items-center justify-center"
                  style={{ borderColor: mbtiColor(shapes.readProfile(other).mbti) }}
                >
                  {other?.photoURL
                    ? <img src={other.photoURL} alt="" className="w-full h-full object-cover" />
                    : <Gamepad2 size={18} strokeWidth={2.5} className="text-ink" aria-hidden="true" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="pixel-font text-[9px] text-ink truncate">
                    {other?.displayName ?? '...'}
                  </p>
                  <p className="text-ink-soft truncate mt-0.5" style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}>
                    {chat?.lastMessage || 'เริ่มการสนทนา'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {chat?.lastMessageAt && (
                    <span className="pixel-font text-[6px] text-ink-soft">{fmtTime(chat.lastMessageAt)}</span>
                  )}
                  {(chat?.fireStacks ?? 0) > 0 && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-warn/10 border border-warn/20">
                      <span className="text-[10px] leading-none">🔥</span>
                      <span className="pixel-font text-[6px] text-warn">{chat.fireStacks}</span>
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ChatPanel (main export) ──────────────────────────────────────────────────
export default function ChatPanel({ onClose, initialView = 'list', onAdminContacted }) {
  const user = useAuthStore((s) => s.user)
  const chats = useChatStore((s) => s.chats)
  const loadChats = useChatStore((s) => s.loadChats)
  const openChat = useChatStore((s) => s.openChat)
  // Mutual follows = people I follow who also follow me back
  const following = useSocialStore((s) => s.following)
  const followers = useSocialStore((s) => s.followers)
  const loadMyProfile = useSocialStore((s) => s.loadMyProfile)
  const mutualUids = following.filter((uid) => followers.includes(uid))

  const [view, setView] = useState(initialView)
  const participants = useChatStore((s) => s.participants)
  const [listLoading, setListLoading] = useState(true)
  const [profileReady, setProfileReady] = useState(false)
  const [chatsSnapshotReady, setChatsSnapshotReady] = useState(false)

  // Load chats + social profile in one effect so friends appear without
  // needing to visit SocialPanel first.
  useEffect(() => {
    if (!user?.uid) {
      setListLoading(false)
      setProfileReady(false)
      setChatsSnapshotReady(false)
      return
    }
    let active = true
    setListLoading(true)
    setProfileReady(false)
    setChatsSnapshotReady(false)
    loadMyProfile().finally(() => {
      if (active) setProfileReady(true)
    })
    const unsub = loadChats(user.uid, () => {
      if (active) setChatsSnapshotReady(true)
    })
    return () => {
      active = false
      unsub?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  // Resolve profiles for ALL mutual follows + existing chat members so the
  // friends list shows names immediately, even before any chat doc exists.
  useEffect(() => {
    if (!user?.uid || !profileReady || !chatsSnapshotReady) return
    let cancelled = false
    const needed = [
      ...new Set([
        ...mutualUids,
        ...chats.flatMap((c) => c.members?.filter((uid) => uid !== user.uid) ?? []),
      ]),
    ]
    useChatStore.getState().resolveParticipants(needed).finally(() => {
      if (!cancelled) setListLoading(false)
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady, chatsSnapshotReady, chats, mutualUids.join(','), user?.uid])

  const isCurrentUserAdmin = user?.uid === ADMIN_UID

  // Open (or create) a chat with any friend — works whether a chat doc exists yet or not.
  async function handleSelectFriend(uid) {
    const other = await useChatStore.getState().getOrFetchParticipant(uid)
    await openChat(buildChatId(user.uid, uid), other)
    setView('window')
  }

  async function handleOpenAdminChat() {
    await openChat(buildChatId(user.uid, ADMIN_UID), {
      uid: ADMIN_UID,
      displayName: ADMIN_DISPLAY_NAME,
      photoURL: null,
      isAdmin: true,
    })
    setView('window')
  }

  return (
    <div
      className="absolute inset-x-0 z-50 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden md:max-w-2xl md:mx-auto lg:max-w-3xl"
      style={{ top: '10%', bottom: 0 }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-ink rounded-full" />
      </div>

      {/* Inner card */}
      <div className="px-4 pb-4 flex-1 flex flex-col overflow-hidden">
        <div className="rounded-xl bg-white border border-ink/10  overflow-hidden flex-1 flex flex-col">
          {/* Close button — only shown in list view; window/shop have back arrow */}
          {view === 'list' && (
            <div className="flex justify-end px-4 pt-3 shrink-0">
              <button
                onClick={onClose}
                aria-label="ปิด"
                className="neo-btn w-9 h-9 flex items-center justify-center rounded-lg bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X size={16} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          )}

          {view === 'list' ? (
            <ChatListView
              user={user}
              participants={participants}
              mutualUids={mutualUids}
              chats={chats}
              onSelectFriend={handleSelectFriend}
              adminChat={chats.find((c) => c.isAdminChat === true)}
              onOpenAdminChat={handleOpenAdminChat}
              onOpenShop={() => setView('shop')}
              isCurrentUserAdmin={isCurrentUserAdmin}
              loading={listLoading}
            />
          ) : view === 'shop' ? (
            <ShopChatView onBack={() => setView('list')} />
          ) : (
            <ChatWindowView
              user={user}
              onBack={() => setView('list')}
              onAdminContacted={onAdminContacted}
              onVisitMap={async (uid) => {
                await visitMap(uid)
                onClose()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
