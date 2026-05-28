import { useEffect, useRef, useState } from 'react'
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, updateDoc } from 'firebase/firestore'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { db } from '../firebase'
import { useAuthStore } from '../stores/useAuthStore'
import { useChatStore, buildChatId } from '../stores/useChatStore'
import { useSocialStore } from '../stores/useSocialStore'
import { useUserStore } from '../stores/useUserStore'

// ─── MBTI colours (consistent with SocialPanel) ──────────────────────────────
const MBTI_COLORS = {
  INTJ: '#7c3aed', INTP: '#7c3aed', ENTJ: '#7c3aed', ENTP: '#7c3aed',
  INFJ: '#059669', INFP: '#059669', ENFJ: '#059669', ENFP: '#059669',
  ISTJ: '#2563eb', ISFJ: '#2563eb', ESTJ: '#2563eb', ESFJ: '#2563eb',
  ISTP: '#d97706', ISFP: '#d97706', ESTP: '#d97706', ESFP: '#d97706',
}
function mbtiColor(mbti) { return MBTI_COLORS[mbti] ?? '#a78bda' }

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
        className="w-full bg-white rounded-t-3xl shadow-2xl pb-6"
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

// ─── ChatWindowView ───────────────────────────────────────────────────────────
function ChatWindowView({ user, onBack }) {
  const { activeChat, messages, sendMessage, subscribeMessages } = useChatStore()
  const chats = useChatStore((s) => s.chats)

  const { chatId, otherUser } = activeChat ?? {}
  const chatDoc = chats.find((c) => c.id === chatId)
  const fireStacks = chatDoc?.fireStacks ?? 0

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showGift, setShowGift] = useState(false)
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
    try { await sendMessage(chatId, draft) } finally { setSending(false) }
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
        <div
          className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 shrink-0 border-2 flex items-center justify-center"
          style={{ borderColor: mbtiColor(otherUser?.mbti) }}
        >
          {otherUser?.photoURL
            ? <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
            : <span className="text-base">🎮</span>}
        </div>
        {/* Name + MBTI */}
        <div className="flex-1 min-w-0">
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
        </div>
        {/* Fire stacks badge — animates on increment */}
        <div
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-50 border border-orange-100 shrink-0 ${
            stackAnimating ? 'animate-stack-pop' : ''
          }`}
        >
          <span className="text-sm leading-none">🔥</span>
          <span className="pixel-font text-[9px] text-orange-500">{fireStacks}</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 opacity-50">
            <span className="text-4xl">💬</span>
            <p className="pixel-font text-[7px] text-gray-400 text-center leading-relaxed">
              เริ่มการสนทนาเลย!
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[72%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                  isMe
                    ? 'bg-[#a78bda] text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
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
                ) : (
                  <p
                    style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 13, lineHeight: 1.55 }}
                  >
                    {msg.text}
                  </p>
                )}
                <p className={`pixel-font text-[5px] mt-1 ${isMe ? 'text-right text-purple-200' : 'text-gray-400'}`}>
                  {fmtTime(msg.createdAt)}
                </p>
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

      {/* Gift modal — absolute inside the panel, z-[70] */}
      {showGift && (
        <GiftModal
          chatId={chatId}
          myUid={user?.uid}
          onClose={() => setShowGift(false)}
        />
      )}
    </div>
  )
}

// ─── ChatListView ─────────────────────────────────────────────────────────────
// Receives mutualUids (all friends) + chats (existing docs) separately so it
// can show every mutual follow even before the first message is sent.
function ChatListView({ user, participants, mutualUids, chats, onSelectFriend }) {
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
      ) : (
        <div className="flex-1 overflow-y-auto">
          {mutualUids.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-60">
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
            // Look up any existing chat with this friend
            const chat = chats.find((c) => c.members?.includes(uid))
            return (
              <button
                key={uid}
                onClick={() => onSelectFriend(uid)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 shrink-0 border-2 flex items-center justify-center"
                  style={{ borderColor: mbtiColor(other?.mbti) }}
                >
                  {other?.photoURL
                    ? <img src={other.photoURL} alt="" className="w-full h-full object-cover" />
                    : <span className="text-lg">🎮</span>}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="pixel-font text-[9px] text-gray-800 truncate">
                    {other?.displayName ?? '...'}
                  </p>
                  <p
                    className="text-gray-400 truncate mt-0.5"
                    style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}
                  >
                    {chat?.lastMessage || 'เริ่มการสนทนา'}
                  </p>
                </div>
                {/* Meta */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {chat?.lastMessageAt && (
                    <span className="pixel-font text-[6px] text-gray-400">
                      {fmtTime(chat.lastMessageAt)}
                    </span>
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
export default function ChatPanel({ onClose }) {
  const user = useAuthStore((s) => s.user)
  const { chats, loadChats, openChat } = useChatStore()
  // Mutual follows = people I follow who also follow me back
  const following = useSocialStore((s) => s.following)
  const followers = useSocialStore((s) => s.followers)
  const loadMyProfile = useSocialStore((s) => s.loadMyProfile)
  const mutualUids = following.filter((uid) => followers.includes(uid))

  const [view, setView] = useState('list')
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

  return (
    <div
      className="absolute inset-x-0 z-50 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden"
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
            />
          ) : (
            <ChatWindowView
              user={user}
              onBack={() => setView('list')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
