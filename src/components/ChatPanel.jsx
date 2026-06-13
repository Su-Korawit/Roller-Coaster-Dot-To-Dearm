import { useEffect, useRef, useState } from 'react'
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, updateDoc } from 'firebase/firestore'
import { ArrowLeft, Loader2, Send, Wrench } from 'lucide-react'
import { db } from '../firebase'
import { useAuthStore } from '../stores/useAuthStore'
import { useChatStore, buildChatId } from '../stores/useChatStore'
import { ADMIN_UID, ADMIN_DISPLAY_NAME, ADMIN_EMAIL } from '../constants/admin'
import { useSocialStore } from '../stores/useSocialStore'
import { useUserStore } from '../stores/useUserStore'
import { mbtiColor } from '../constants/mbtiColors'

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
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: myUid,
        text: `${gift.emoji} ${gift.name}`,
        type: 'gift',
        giftItem: { name: gift.name, emoji: gift.emoji, coins: gift.coins },
        createdAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: `${gift.emoji} ส่งของขวัญ`,
        lastMessageAt: serverTimestamp(),
        fireStacks: increment(1),
      })
      useUserStore.getState().incrementStacks()
      onClose()
    } catch {
      addCoins(gift.coins) // rollback
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="absolute inset-0 z-[70] flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl pb-6 md:max-w-lg md:mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <p className="pixel-font text-[10px] text-center text-gray-700 mb-1">🎁 Virtual Gift</p>
        <p className="pixel-font text-[7px] text-center text-gray-400 mb-5">
          {coins}
          <span className="inline-block ml-1 w-3.5 h-3.5 rounded-full border border-yellow-500 text-center text-[7px] leading-[13px] text-yellow-600">$</span>
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
                    ? 'border-[#a78bda]/30 bg-purple-50 hover:border-[#a78bda]'
                    : 'border-gray-100 bg-gray-50 opacity-40'
                }`}
              >
                {busy === g.name
                  ? <Loader2 size={24} className="animate-spin text-purple-400" />
                  : <span className="text-3xl">{g.emoji}</span>}
                <span className="pixel-font text-[7px] text-gray-700">{g.name}</span>
                <span className="pixel-font text-[7px] text-yellow-600">{g.coins} $</span>
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
      await addDoc(collection(db, 'users', friendUser?.uid, 'receivedCredits'), {
        fromUid: user?.uid ?? '',
        fromName: user?.displayName ?? '',
        taskTitle: snap.title,
        journeyKey: snap.linkedJourneyKey ?? null,
        message: note.trim(),
        createdAt: serverTimestamp(),
      })
      markTaskCredited(snap.taskId)
      onDone(snap.taskId)
    } catch (e) {
      console.error('[Credit]', e)
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setBusy(false)
    }
  }

  return (
    <div className="absolute inset-0 z-70 flex flex-col justify-end" onClick={onClose}>
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl px-5 pb-6 pt-4 md:max-w-lg md:mx-auto md:w-full"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <p className="pixel-font text-[10px] text-gray-800 text-center mb-1">🏅 ให้ Credit เพื่อน</p>
        <p className="text-center text-gray-500 mb-4 text-[11px]" style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
          ให้ Credit แก่ <strong>{friendUser?.displayName ?? 'เพื่อน'}</strong> สำหรับ "{snap.title}"?
        </p>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เขียนข้อความขอบคุณ (optional)..."
          className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#a78bda] resize-none mb-3"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 13 }}
          disabled={busy}
        />
        {error && <p className="pixel-font text-[7px] text-red-400 text-center mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-500 pixel-font text-[8px] active:scale-95 transition-transform"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-amber-400 text-white pixel-font text-[8px] active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-1"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : '🏅 ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ChatWindowView ───────────────────────────────────────────────────────────
function ChatWindowView({ user, onBack, onAdminContacted }) {
  const { activeChat, messages, sendMessage, subscribeMessages } = useChatStore()
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

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (!activeChat) return null

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <button onClick={onBack} className="active:scale-90 transition-transform text-gray-500 shrink-0">
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
            className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 shrink-0 border-2 flex items-center justify-center"
            style={{ borderColor: mbtiColor(otherUser?.mbti) }}
          >
            {otherUser?.photoURL
              ? <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
              : <span className="text-base">🎮</span>}
          </div>
        )}
        {/* Name */}
        <div className="flex-1 min-w-0">
          {isAdminChat ? (
            <>
              <div className="flex items-center gap-1.5">
                <p className="pixel-font text-[9px] text-gray-800 truncate">{ADMIN_DISPLAY_NAME}</p>
                <span className="pixel-font text-[5px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 shrink-0">Admin</span>
              </div>
              <p className="pixel-font text-[6px] text-gray-400 mt-0.5">{ADMIN_EMAIL}</p>
            </>
          ) : (
            <>
              <p className="pixel-font text-[9px] text-gray-800 truncate">
                {otherUser?.displayName || '...'}
              </p>
              {otherUser?.mbti && (
                <span
                  className="pixel-font text-[6px] px-1.5 py-0.5 rounded-md text-white inline-block mt-0.5"
                  style={{ background: mbtiColor(otherUser.mbti) }}
                >
                  {otherUser.mbti}
                </span>
              )}
            </>
          )}
        </div>
        {/* Fire stacks badge — hidden for admin chats */}
        {!isAdminChat && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-50 border border-orange-100 shrink-0 ${
              stackAnimating ? 'animate-stack-pop' : ''
            }`}
          >
            <span className="text-sm leading-none">🔥</span>
            <span className="pixel-font text-[9px] text-orange-500">{fireStacks}</span>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          isAdminChat ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center max-w-70">
                <p className="text-3xl mb-3">👋</p>
                <p
                  className="text-gray-500 leading-relaxed"
                  style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 13 }}
                >
                  สวัสดีครับ/ค่ะ<br />
                  ติดต่อสอบถามหรือแจ้งปัญหา<br />
                  เกี่ยวกับ RollerCoaster<br />
                  ได้เลยครับ
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 opacity-50">
              <span className="text-4xl">💬</span>
              <p className="pixel-font text-[7px] text-gray-400 text-center leading-relaxed">
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
                className={`max-w-[76%] rounded-2xl shadow-sm overflow-hidden ${isCard ? '' : 'px-3.5 py-2.5'} ${
                  msg.type === 'shared_task'
                    ? 'bg-gray-900 border border-[#a78bda]/40'
                    : isMe
                      ? 'bg-[#a78bda] text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
                style={msg.type === 'shared_task' ? { borderLeft: '3px solid #a78bda' } : {}}
              >
                {msg.type === 'gift' ? (
                  <div className="flex flex-col items-center gap-1 py-0.5 px-2">
                    <span className="text-2xl leading-none">{msg.giftItem?.emoji ?? '🎁'}</span>
                    <span className={`pixel-font text-[7px] ${isMe ? 'text-purple-100' : 'text-gray-600'}`}>
                      {msg.giftItem?.name}
                    </span>
                    <span className={`pixel-font text-[6px] ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                      {msg.giftItem?.coins} coins
                    </span>
                  </div>

                ) : msg.type === 'news' ? (
                  <div className="flex flex-col w-48">
                    {msg.newsItem?.thumbnail && (
                      <img src={msg.newsItem.thumbnail} alt={msg.newsItem.title} className="w-full h-24 object-cover" />
                    )}
                    <div className="px-3 py-2">
                      <p className={`pixel-font text-[6px] mb-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>📰 CAMPHUB</p>
                      <p className={`text-[11px] font-semibold leading-snug mb-2 ${isMe ? 'text-white' : 'text-gray-800'}`}
                        style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
                        {msg.newsItem?.title}
                      </p>
                      <button
                        onClick={() => window.open(msg.newsItem?.url, '_blank', 'noopener,noreferrer')}
                        className={`pixel-font text-[6px] px-2 py-1 rounded-lg active:scale-95 transition-transform ${
                          isMe ? 'bg-white/20 text-white' : 'bg-white text-[#a78bda] border border-purple-100'
                        }`}
                      >อ่านต่อ →</button>
                    </div>
                    <p className={`pixel-font text-[5px] px-3 pb-2 ${isMe ? 'text-right text-purple-200' : 'text-gray-400'}`}>
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
                      <div className="flex items-start gap-2 px-3 pt-3 pb-2 border-b border-[#a78bda]/20">
                        <span className="text-lg leading-none shrink-0">📋</span>
                        <div className="flex-1 min-w-0">
                          <p className="pixel-font text-[6px] text-[#a78bda] mb-0.5">Task ของ {snap.ownerName}</p>
                          <p className="text-[12px] font-semibold text-white leading-snug"
                            style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
                            {snap.title}
                          </p>
                        </div>
                      </div>
                      {/* Status + badges */}
                      <div className="px-3 py-2 flex flex-col gap-1.5">
                        <span className={`pixel-font text-[7px] ${isCompleted ? 'text-green-400' : 'text-gray-400'}`}>
                          {isCompleted ? '✅ เสร็จแล้ว' : '⏳ กำลังทำอยู่'}
                        </span>
                        {snap.linkedJourneyKey && (
                          <span className="pixel-font text-[6px] px-1.5 py-0.5 rounded bg-[#a78bda]/20 text-[#c4a4f0] self-start">
                            {snap.linkedJourneyKey}
                          </span>
                        )}
                        {showCredit && (
                          <button
                            onClick={() => setCreditTarget(msg)}
                            className="mt-0.5 w-full pixel-font text-[7px] py-1.5 rounded-lg bg-amber-400 text-white active:scale-95 transition-transform"
                          >
                            🏅 ให้ Credit เพื่อน
                          </button>
                        )}
                      </div>
                      <p className="pixel-font text-[5px] text-right text-gray-500 px-3 pb-2">
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
                  <p className={`pixel-font text-[5px] mt-1 ${isMe ? 'text-right text-purple-200' : 'text-gray-400'}`}>
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
      <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-2.5 flex items-center gap-2">
        <button
          onClick={() => setShowGift(true)}
          className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-lg active:scale-90 transition-transform shrink-0"
          title="ส่งของขวัญ"
        >
          🎁
        </button>
        <button
          onClick={() => alert('นัดหมาย — เร็วๆ นี้!')}
          className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg active:scale-90 transition-transform shrink-0"
          title="นัดหมาย"
        >
          📅
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 bg-gray-50 rounded-xl px-3 py-2 outline-none border border-gray-200 focus:border-[#a78bda] transition-colors"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 13 }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-9 h-9 rounded-xl bg-[#a78bda] flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50 shrink-0 shadow-sm"
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
function ChatListView({ user, participants, mutualUids, chats, onSelectFriend, adminChat, onOpenAdminChat, isCurrentUserAdmin }) {
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
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
        <h2 className="pixel-font text-[12px] text-gray-800">Messages</h2>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50 border border-orange-100">
          <span className="text-sm leading-none">🔥</span>
          <span className="pixel-font text-[9px] text-orange-500">{totalStacks}</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-100 bg-white shrink-0">
        {CHAT_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setChatTab(id)}
            className={`flex-1 py-2.5 pixel-font text-[7px] transition-colors border-b-2 ${
              chatTab === id
                ? 'text-[#a78bda] border-[#a78bda]'
                : 'text-gray-400 border-transparent'
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
          <p className="pixel-font text-[8px] text-gray-400">Coming Soon</p>
        </div>
      ) : isCurrentUserAdmin ? (
        /* ── Admin view: show all user conversations ── */
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-60">
              <span className="text-4xl">📩</span>
              <p className="pixel-font text-[8px] text-gray-400 text-center">ยังไม่มีข้อความจากผู้ใช้</p>
            </div>
          )}
          {chats.map((chat) => {
            const otherUid = chat.members?.find((uid) => uid !== user.uid)
            if (!otherUid) return null
            const other = participants[otherUid]
            return (
              <button
                key={chat.id}
                onClick={() => onSelectFriend(otherUid)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div
                  className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 shrink-0 border-2 flex items-center justify-center"
                  style={{ borderColor: mbtiColor(other?.mbti) }}
                >
                  {other?.photoURL
                    ? <img src={other.photoURL} alt="" className="w-full h-full object-cover" />
                    : <span className="text-lg">🎮</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="pixel-font text-[9px] text-gray-800 truncate">
                    {other?.displayName ?? otherUid.slice(0, 8) + '…'}
                  </p>
                  <p className="text-gray-400 truncate mt-0.5" style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}>
                    {chat.lastMessage || 'ส่งข้อความแล้ว'}
                  </p>
                </div>
                {chat.lastMessageAt && (
                  <span className="pixel-font text-[6px] text-gray-400 shrink-0">{fmtTime(chat.lastMessageAt)}</span>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        /* ── Regular user view: admin row at top + mutual friends ── */
        <div className="flex-1 overflow-y-auto">
          {/* Admin contact row — always visible */}
          <button
            onClick={onOpenAdminChat}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-purple-50 hover:bg-purple-50 active:bg-purple-100 transition-colors text-left"
          >
            <div
              className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #a78bda, #7c3aed)' }}
            >
              <Wrench size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="pixel-font text-[9px] text-gray-800 truncate">{ADMIN_DISPLAY_NAME}</p>
                <span className="pixel-font text-[5px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 shrink-0">Admin</span>
              </div>
              <p className="text-gray-400 truncate mt-0.5" style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}>
                {adminChat?.lastMessage || 'ติดต่อสอบถาม / แจ้งปัญหา'}
              </p>
            </div>
            {adminChat?.lastMessageAt && (
              <span className="pixel-font text-[6px] text-gray-400 shrink-0">{fmtTime(adminChat.lastMessageAt)}</span>
            )}
          </button>

          {/* Mutual friends */}
          {mutualUids.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
              <span className="text-4xl">👥</span>
              <p className="pixel-font text-[8px] text-gray-400 text-center leading-relaxed">
                ยังไม่มีเพื่อนที่ติดตามกัน
              </p>
              <p className="pixel-font text-[6px] text-gray-300 text-center leading-relaxed mt-1">
                ไปติดตามเพื่อนใน Social ก่อนนะ
              </p>
            </div>
          )}
          {mutualUids.map((uid) => {
            const other = participants[uid]
            const chat = chats.find((c) => c.members?.includes(uid))
            return (
              <button
                key={uid}
                onClick={() => onSelectFriend(uid)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div
                  className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 shrink-0 border-2 flex items-center justify-center"
                  style={{ borderColor: mbtiColor(other?.mbti) }}
                >
                  {other?.photoURL
                    ? <img src={other.photoURL} alt="" className="w-full h-full object-cover" />
                    : <span className="text-lg">🎮</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="pixel-font text-[9px] text-gray-800 truncate">
                    {other?.displayName ?? '...'}
                  </p>
                  <p className="text-gray-400 truncate mt-0.5" style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}>
                    {chat?.lastMessage || 'เริ่มการสนทนา'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {chat?.lastMessageAt && (
                    <span className="pixel-font text-[6px] text-gray-400">{fmtTime(chat.lastMessageAt)}</span>
                  )}
                  {(chat?.fireStacks ?? 0) > 0 && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-orange-50 border border-orange-100">
                      <span className="text-[10px] leading-none">🔥</span>
                      <span className="pixel-font text-[6px] text-orange-500">{chat.fireStacks}</span>
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── ChatPanel (main export) ──────────────────────────────────────────────────
export default function ChatPanel({ onClose, initialView = 'list', onAdminContacted }) {
  const user = useAuthStore((s) => s.user)
  const { chats, loadChats, openChat } = useChatStore()
  // Mutual follows = people I follow who also follow me back
  const following = useSocialStore((s) => s.following)
  const followers = useSocialStore((s) => s.followers)
  const loadMyProfile = useSocialStore((s) => s.loadMyProfile)
  const mutualUids = following.filter((uid) => followers.includes(uid))

  const [view, setView] = useState(initialView)
  const [participants, setParticipants] = useState({})

  // Load chats + social profile in one effect so friends appear without
  // needing to visit SocialPanel first.
  useEffect(() => {
    if (!user?.uid) return
    loadMyProfile()
    const unsub = loadChats(user.uid)
    return () => unsub?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  // Resolve profiles for ALL mutual follows + existing chat members so the
  // friends list shows names immediately, even before any chat doc exists.
  useEffect(() => {
    if (!user?.uid) return
    const needed = [
      ...new Set([
        ...mutualUids,
        ...chats.flatMap((c) => c.members?.filter((uid) => uid !== user.uid) ?? []),
      ]),
    ].filter((uid) => !participants[uid])

    needed.forEach(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid))
      if (snap.exists()) setParticipants((p) => ({ ...p, [uid]: snap.data() }))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, mutualUids.join(','), user?.uid])

  const isCurrentUserAdmin = user?.uid === ADMIN_UID

  // Open (or create) a chat with any friend — works whether a chat doc exists yet or not.
  async function handleSelectFriend(uid) {
    let other = participants[uid]
    if (!other) {
      const snap = await getDoc(doc(db, 'users', uid))
      other = snap.exists() ? snap.data() : { uid, displayName: 'Unknown', photoURL: null }
      setParticipants((p) => ({ ...p, [uid]: other }))
    }
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
      style={{ top: '10%', bottom: '72px' }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Inner card */}
      <div className="px-4 pb-4 flex-1 flex flex-col overflow-hidden">
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          {/* Close button — only shown in list view; window has back arrow */}
          {view === 'list' && (
            <div className="flex justify-end px-4 pt-3 shrink-0">
              <button onClick={onClose} className="text-gray-400 text-xl leading-none">x</button>
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
              isCurrentUserAdmin={isCurrentUserAdmin}
            />
          ) : (
            <ChatWindowView
              user={user}
              onBack={() => setView('list')}
              onAdminContacted={onAdminContacted}
            />
          )}
        </div>
      </div>
    </div>
  )
}
