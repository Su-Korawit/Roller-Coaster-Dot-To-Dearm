import { useEffect, useState } from 'react'
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, updateDoc } from 'firebase/firestore'
import { Loader2, MessageCircle } from 'lucide-react'
import { db } from '../firebase'
import { useAuthStore } from '../stores/useAuthStore'
import { useChatStore } from '../stores/useChatStore'
import { useUserStore } from '../stores/useUserStore'

// ─── Assets ──────────────────────────────────────────────────────────────────
const camphubLogo   = new URL('../../assets/eachPageAssets/news/camphub_logo.png',   import.meta.url).href
const camphubPoster = new URL('../../assets/eachPageAssets/news/camphub_poster.jpg', import.meta.url).href

const NEWS_ITEMS = [
  {
    id: 'n1',
    source: 'CAMPHUB',
    title: 'Hackathon Thailand 2026 — เปิดรับสมัครแล้ว!',
    desc: 'ประกวดไอเดีย AI & Tech Solutions ชิงทุนกว่า 500,000 บาท',
    poster: camphubPoster,
    url: 'https://camphub.in.th',
    date: '14 เม.ย. 2026',
  },
  {
    id: 'n2',
    source: 'CAMPHUB',
    title: 'Data Science Bootcamp รุ่น 12',
    desc: 'เรียนเข้มข้น 3 เดือน พร้อมหางานหลังจบ — สมัครได้ถึง 30 เม.ย.',
    poster: camphubPoster,
    url: 'https://camphub.in.th',
    date: '10 เม.ย. 2026',
  },
]

// ─── ShareSheet ───────────────────────────────────────────────────────────────
function ShareSheet({ item, onClose }) {
  const user = useAuthStore((s) => s.user)
  const chats = useChatStore((s) => s.chats)
  const loadChats = useChatStore((s) => s.loadChats)
  const [participants, setParticipants] = useState({})
  const [sending, setSending] = useState(null)

  // Ensure chats are loaded — ChatPanel may not have mounted yet
  useEffect(() => {
    if (!user?.uid) return
    const unsub = loadChats(user.uid)
    return () => unsub?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  // Resolve the "other" member of each chat to their user profile
  useEffect(() => {
    if (!user?.uid) return
    const needed = [
      ...new Set(chats.flatMap((c) => c.members?.filter((uid) => uid !== user.uid) ?? [])),
    ].filter((uid) => !participants[uid])

    needed.forEach(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid))
      if (snap.exists()) setParticipants((p) => ({ ...p, [uid]: snap.data() }))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, user?.uid])

  async function handleSend(chat) {
    const uid = user?.uid
    if (!uid || sending) return
    setSending(chat.id)
    try {
      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        senderId: uid,
        text: `📰 ${item.title}`,
        type: 'news',
        newsItem: { title: item.title, url: item.url, thumbnail: item.poster },
        giftItem: null,
        createdAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: `📰 ${item.title}`,
        lastMessageAt: serverTimestamp(),
        fireStacks: increment(1),
      })
      useUserStore.getState().incrementStacks()
      onClose()
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="absolute inset-0 z-70 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: '80px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-3">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <p className="pixel-font text-[9px] text-center text-gray-700 mb-1 px-5">ส่งไปยัง...</p>
        <p
          className="text-center text-gray-500 mb-4 px-6 truncate"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}
        >
          📰 {item.title}
        </p>

        {/* Chat list */}
        {chats.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 opacity-50">
            <span className="text-3xl">💬</span>
            <p className="pixel-font text-[7px] text-gray-400 text-center leading-relaxed">
              ยังไม่มีการสนทนา
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {chats.map((chat) => {
              const otherUid = chat.members?.find((uid) => uid !== user?.uid)
              const other = participants[otherUid]
              return (
                <button
                  key={chat.id}
                  onClick={() => handleSend(chat)}
                  disabled={!!sending}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0 border border-gray-200">
                    {other?.photoURL
                      ? <img src={other.photoURL} alt="" className="w-full h-full object-cover" />
                      : <span className="text-base">🎮</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="pixel-font text-[8px] text-gray-800 truncate">
                      {other?.displayName ?? '...'}
                    </p>
                    <p
                      className="text-gray-400 truncate mt-0.5"
                      style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}
                    >
                      {chat.lastMessage || 'เริ่มการสนทนา'}
                    </p>
                  </div>
                  {sending === chat.id
                    ? <Loader2 size={14} className="text-purple-400 animate-spin shrink-0" />
                    : <span className="pixel-font text-[7px] text-[#a78bda] shrink-0">ส่ง</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── NewsPanel ────────────────────────────────────────────────────────────────
export default function NewsPanel({ onClose }) {
  const [sharingItem, setSharingItem] = useState(null)

  function openLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-white/95 backdrop-blur-sm rounded-t-4xl overflow-hidden"
      style={{ top: '8%' }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <img src={camphubLogo} alt="CAMPHUB" className="w-7 h-7 rounded-lg object-contain" />
          <h2 className="pixel-font text-[12px] text-gray-800">News</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 text-xl leading-none">✕</button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {NEWS_ITEMS.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white"
          >
            {/* Tappable content area → opens link */}
            <button
              onClick={() => openLink(item.url)}
              className="w-full text-left active:brightness-95 transition-all"
            >
              <img
                src={item.poster}
                alt={item.title}
                className="w-full h-36 object-cover"
              />
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-1 mb-1">
                  <img src={camphubLogo} alt="" className="w-4 h-4 rounded object-contain" />
                  <span className="text-[10px] text-purple-500 font-semibold">{item.source}</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{item.date}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 leading-snug">{item.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </button>

            {/* Share to chat */}
            <div className="px-4 pb-3 pt-1 border-t border-gray-50 flex justify-end">
              <button
                onClick={() => setSharingItem(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-[#a78bda] border border-purple-100 active:scale-95 transition-transform"
              >
                <MessageCircle size={13} strokeWidth={2} />
                <span className="pixel-font text-[7px]">Share to chat</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Share sheet overlay */}
      {sharingItem && (
        <ShareSheet item={sharingItem} onClose={() => setSharingItem(null)} />
      )}
    </div>
  )
}
