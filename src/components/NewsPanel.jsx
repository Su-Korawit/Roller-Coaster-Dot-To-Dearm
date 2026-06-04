import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { db } from '../firebase'
import { useAuthStore } from '../stores/useAuthStore'
import { useChatStore } from '../stores/useChatStore'
import { useUserStore } from '../stores/useUserStore'
import { ADMIN_UID } from '../constants/admin'
import { STATIC_UPDATES, UPDATE_TYPES } from '../data/appUpdates'

// ─── Assets ──────────────────────────────────────────────────────────────────
const camphubLogo = new URL('../../assets/eachPageAssets/news/camphub_logo.png', import.meta.url).href
const placeholderPoster = new URL('../../assets/eachPageAssets/news/camphub_poster.jpg', import.meta.url).href

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

// ─── AddUpdateSheet (admin only) ──────────────────────────────────────────────
function AddUpdateSheet({ onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('new')
  const [image, setImage] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!title.trim() || !description.trim() || saving) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'appUpdates'), {
        type,
        title: title.trim(),
        description: description.trim(),
        image: image.trim() || null,
        createdAt: serverTimestamp(),
      })
      onClose()
    } finally {
      setSaving(false)
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

        <p className="pixel-font text-[9px] text-center text-gray-700 mb-4 px-5">เพิ่มอัปเดต</p>

        <div className="px-5 space-y-3" style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
          {/* Type badges */}
          <div className="flex gap-2">
            {Object.entries(UPDATE_TYPES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  type === key ? t.color + ' ring-2 ring-offset-1 ring-purple-200' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="หัวข้อ"
            className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-purple-300"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="รายละเอียด"
            rows={3}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-purple-300 resize-none"
          />
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="URL รูป (ไม่ใส่ก็ได้)"
            className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-purple-300"
          />

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#a78bda] text-white font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'เพิ่มอัปเดต'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── NewsPanel ────────────────────────────────────────────────────────────────
export default function NewsPanel({ onClose }) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.uid === ADMIN_UID

  const [activeTab, setActiveTab] = useState('camphub')
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sharingItem, setSharingItem] = useState(null)
  const [fsUpdates, setFsUpdates] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchCamps()
  }, [])

  // Real-time subscription to admin-added updates
  useEffect(() => {
    const q = query(collection(db, 'appUpdates'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setFsUpdates(snap.docs.map((d) => ({ id: d.id, _firestore: true, ...d.data() })))
    })
    return () => unsub()
  }, [])

  // Merge static + Firestore updates, sort by date desc
  const allUpdates = [...STATIC_UPDATES, ...fsUpdates]
    .map((u) => ({ ...u, _ts: u.createdAt?.toMillis?.() ?? new Date(u.date).getTime() }))
    .sort((a, b) => b._ts - a._ts)

  async function handleDeleteUpdate(id) {
    await deleteDoc(doc(db, 'appUpdates', id))
  }

  async function fetchCamps() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/camphub')
      if (!res.ok) throw new Error('Failed to fetch camps')
      const data = await res.json()
      setCamps(data)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching camps:', err)
    } finally {
      setLoading(false)
    }
  }

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

      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        {[
          { key: 'camphub', label: 'Camphub' },
          { key: 'rollercoaster', label: 'RollerCoaster' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 pixel-font text-[9px] transition-colors ${
              activeTab === tab.key
                ? 'text-[#a78bda] border-b-2 border-[#a78bda]'
                : 'text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Camphub Feed */}
      {activeTab === 'camphub' && (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          // Skeleton loading
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white animate-pulse"
              >
                <div className="w-full h-36 bg-gray-200" />
                <div className="px-4 py-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))}
          </>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm text-gray-500 text-center">{error}</p>
            <button
              onClick={fetchCamps}
              className="px-4 py-2 text-[11px] rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200"
            >
              ลองใหม่
            </button>
          </div>
        ) : camps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-3xl">📭</span>
            <p className="text-sm text-gray-500">ไม่พบข้อมูลค่าย</p>
          </div>
        ) : (
          camps.map((camp, idx) => (
            <div
              key={idx}
              className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white"
            >
              {/* Tappable content area → opens link */}
              <button
                onClick={() => openLink(camp.link)}
                className="w-full text-left active:brightness-95 transition-all"
              >
                <img
                  src={camp.poster_image || placeholderPoster}
                  alt={camp.title}
                  className="w-full h-36 object-cover bg-gray-200"
                  onError={(e) => {
                    e.target.src = placeholderPoster
                  }}
                />
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <img src={camphubLogo} alt="" className="w-4 h-4 rounded object-contain" />
                    <span className="text-[10px] text-purple-500 font-semibold">CAMPHUB</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
                    {camp.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                    {camp.small_description}
                  </p>
                </div>
              </button>

              {/* Share to chat */}
              <div className="px-4 pb-3 pt-1 border-t border-gray-50 flex justify-end">
                <button
                  onClick={() => setSharingItem(camp)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-[#a78bda] border border-purple-100 active:scale-95 transition-transform"
                >
                  <MessageCircle size={13} strokeWidth={2} />
                  <span className="pixel-font text-[7px]">Share to chat</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      )}

      {/* RollerCoaster Feed */}
      {activeTab === 'rollercoaster' && (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Admin: add update button */}
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-purple-200 text-[#a78bda] active:scale-95 transition-transform"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="pixel-font text-[8px]">เพิ่มอัปเดต</span>
          </button>
        )}

        {allUpdates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-3xl">🎢</span>
            <p className="text-sm text-gray-500">ยังไม่มีอัปเดต</p>
          </div>
        ) : (
          allUpdates.map((u) => {
            const badge = UPDATE_TYPES[u.type] ?? UPDATE_TYPES.update
            return (
              <div
                key={u.id}
                className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white"
              >
                {u.image && (
                  <img
                    src={u.image}
                    alt={u.title}
                    className="w-full h-36 object-cover bg-gray-200"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(u._ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{u.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed whitespace-pre-line">{u.description}</p>
                </div>

                {/* Actions */}
                <div className="px-4 pb-3 pt-1 border-t border-gray-50 flex justify-end items-center gap-2">
                  {isAdmin && u._firestore && (
                    <button
                      onClick={() => handleDeleteUpdate(u.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-red-500 border border-red-100 active:scale-95 transition-transform"
                    >
                      <Trash2 size={13} strokeWidth={2} />
                      <span className="pixel-font text-[7px]">ลบ</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSharingItem({ title: u.title, link: '', poster_image: u.image })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-[#a78bda] border border-purple-100 active:scale-95 transition-transform"
                  >
                    <MessageCircle size={13} strokeWidth={2} />
                    <span className="pixel-font text-[7px]">Share to chat</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
      )}

      {/* Add update form (admin) */}
      {showAddForm && <AddUpdateSheet onClose={() => setShowAddForm(false)} />}

      {/* Share sheet overlay */}
      {sharingItem && (
        <ShareSheet
          item={{
            title: sharingItem.title,
            url: sharingItem.link,
            poster: sharingItem.poster_image || placeholderPoster,
          }}
          onClose={() => setSharingItem(null)}
        />
      )}
    </div>
  )
}
