import { useEffect, useState } from 'react'
import { getDoc } from 'firebase/firestore'
import { Gamepad2, Loader2, MessageCircle, Plus, Trash2, X } from 'lucide-react'
import { refs } from '../lib/db'
import { useAuthStore } from '../stores/useAuthStore'
import { useChatStore } from '../stores/useChatStore'
import { useNewsStore } from '../stores/useNewsStore'
import TcasCalendarTab from './TcasCalendarTab'
import { ADMIN_UID } from '../constants/admin'
import { UPDATE_TYPES } from '../data/appUpdates'
import { CAMP_GROUPS, DEFAULT_CATEGORY, groupKeyForCategory, labelForCategory } from '../data/campCategories'
import { Z_SHEET } from '../constants/zIndex'

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
 const snap = await getDoc(refs.user(uid))
 if (snap.exists()) setParticipants((p) => ({ ...p, [uid]: snap.data() }))
 })
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [chats, user?.uid])

 async function handleSend(chat) {
 const uid = user?.uid
 if (!uid || sending) return
 setSending(chat.id)
 try {
 await useChatStore.getState().sendNewsShare(chat.id, item)
 onClose()
 } finally {
 setSending(null)
 }
 }

 return (
 <div className="absolute inset-0 flex items-end" style={{ zIndex: Z_SHEET }} onClick={onClose}>
 <div
 className="w-full bg-white rounded-t-3xl shadow-hard-sm md:max-w-lg md:mx-auto"
 style={{ paddingBottom: '80px' }}
 onClick={(e) => e.stopPropagation()}
 >
 {/* Handle */}
 <div className="flex justify-center pt-3 pb-3">
 <div className="w-10 h-1 bg-ink rounded-full" />
 </div>

 {/* Header */}
 <p className="thai-font text-xs text-center text-ink mb-1 px-5">ส่งไปยัง...</p>
 <p
 className="text-center text-ink-soft mb-4 px-6 truncate"
 style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}
 >
 📰 {item.title}
 </p>

 {/* Chat list */}
 {chats.length === 0 ? (
 <div className="flex flex-col items-center gap-2 py-8 opacity-50">
 <span className="text-3xl">💬</span>
 <p className="pixel-font text-[7px] text-ink-soft text-center leading-relaxed">
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
 className="w-full flex items-center gap-3 px-5 py-3 hover:bg-paper active:bg-brand-soft transition-colors disabled:opacity-50 text-left"
 >
 <div className="w-9 h-9 rounded-full bg-brand-soft overflow-hidden flex items-center justify-center shrink-0 border border-ink/10">
 {other?.photoURL
 ? <img src={other.photoURL} alt="" className="w-full h-full object-cover" />
 : <Gamepad2 size={16} strokeWidth={2.5} className="text-ink" aria-hidden="true" />}
 </div>
 <div className="flex-1 min-w-0">
 <p className="pixel-font text-[8px] text-ink truncate">
 {other?.displayName ?? '...'}
 </p>
 <p
 className="text-ink-soft truncate mt-0.5"
 style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 11 }}
 >
 {chat.lastMessage || 'เริ่มการสนทนา'}
 </p>
 </div>
 {sending === chat.id
 ? <Loader2 size={14} className="text-brand animate-spin shrink-0" />
 : <span className="thai-font text-xs text-brand shrink-0">ส่ง</span>}
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
 await useNewsStore.getState().addUpdate({ type, title, description, image })
 onClose()
 } finally {
 setSaving(false)
 }
 }

 return (
 <div className="absolute inset-0 flex items-end" style={{ zIndex: Z_SHEET }} onClick={onClose}>
 <div
 className="w-full bg-white rounded-t-3xl shadow-hard-sm md:max-w-lg md:mx-auto"
 style={{ paddingBottom: '80px' }}
 onClick={(e) => e.stopPropagation()}
 >
 {/* Handle */}
 <div className="flex justify-center pt-3 pb-3">
 <div className="w-10 h-1 bg-ink rounded-full" />
 </div>

 <p className="thai-font text-xs text-center text-ink mb-4 px-5">เพิ่มอัปเดต</p>

 <div className="px-5 space-y-3" style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
 {/* Type badges */}
 <div className="flex gap-2">
 {Object.entries(UPDATE_TYPES).map(([key, t]) => (
 <button
 key={key}
 onClick={() => setType(key)}
 className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
 type === key ? t.color + ' ring-2 ring-offset-1 ring-brand/30' : 'bg-brand-soft text-ink-soft'
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
 className="w-full px-3 py-2 rounded-xl bg-paper border border-ink/10 text-sm outline-none focus:border-brand/40"
 />
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="รายละเอียด"
 rows={3}
 className="w-full px-3 py-2 rounded-xl bg-paper border border-ink/10 text-sm outline-none focus:border-brand/40 resize-none"
 />
 <input
 value={image}
 onChange={(e) => setImage(e.target.value)}
 placeholder="URL รูป (ไม่ใส่ก็ได้)"
 className="w-full px-3 py-2 rounded-xl bg-paper border border-ink/10 text-sm outline-none focus:border-brand/40"
 />

 <button
 onClick={handleSubmit}
 disabled={!title.trim() || !description.trim() || saving}
 className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand text-white font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
 >
 {saving ? <Loader2 size={16} className="animate-spin" /> : 'เพิ่มอัปเดต'}
 </button>
 </div>
 </div>
 </div>
 )
}

// ─── UpdateDetailSheet ────────────────────────────────────────────────────────
function UpdateDetailSheet({ update, onClose }) {
 const badge = UPDATE_TYPES[update.type] ?? UPDATE_TYPES.update
 return (
 <div className="absolute inset-0 flex items-end" style={{ zIndex: Z_SHEET }} onClick={onClose}>
 <div
 className="w-full bg-white rounded-t-3xl shadow-hard-sm overflow-y-auto md:max-w-lg md:mx-auto"
 style={{ maxHeight: '80vh', paddingBottom: '80px' }}
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex justify-center pt-3 pb-3">
 <div className="w-10 h-1 bg-ink rounded-full" />
 </div>
 {update.image && (
 <img
 src={update.image}
 alt={update.title}
 className="w-full h-48 object-cover bg-brand-soft/60"
 onError={(e) => { e.target.style.display = 'none' }}
 />
 )}
 <div className="px-5 pt-4 pb-2">
 <div className="flex items-center gap-2 mb-2">
 <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${badge.color}`}>
 {badge.label}
 </span>
 <span className="text-[10px] text-ink-soft">
 {new Date(update._ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
 </span>
 </div>
 <p className="text-base font-bold text-ink leading-snug mb-3">{update.title}</p>
 <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line">{update.description}</p>
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
 const [category, setCategory] = useState(DEFAULT_CATEGORY)
 const [openGroup, setOpenGroup] = useState(() => groupKeyForCategory(DEFAULT_CATEGORY))
 const [sharingItem, setSharingItem] = useState(null)
 const [showAddForm, setShowAddForm] = useState(false)
 const [detailUpdate, setDetailUpdate] = useState(null)

 const allUpdates = useNewsStore((s) => s.getAllUpdates())

 useEffect(() => {
 fetchCamps(category)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [category])

 // Real-time subscription to admin-added updates
 useEffect(() => {
 const unsub = useNewsStore.getState().subscribeUpdates()
 return () => unsub?.()
 }, [])

 async function handleDeleteUpdate(id) {
 await useNewsStore.getState().deleteUpdate(id)
 }

 async function fetchCamps(cat = category) {
 try {
 setLoading(true)
 setError(null)
 const res = await fetch(`/api/camphub?category=${encodeURIComponent(cat)}`)
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
 className="absolute inset-0 z-40 flex flex-col bg-white/95 backdrop-blur-sm rounded-t-4xl overflow-hidden md:max-w-2xl md:mx-auto lg:max-w-3xl"
 style={{ top: '8%' }}
 >
 {/* Handle */}
 <div className="flex justify-center pt-3 pb-1">
 <div className="w-10 h-1 bg-ink rounded-full" />
 </div>

 {/* Header */}
 <div className="flex items-center justify-between px-5 py-3 border-b border-ink/10">
 <div className="flex items-center gap-2">
 <img src={camphubLogo} alt="CAMPHUB" className="w-7 h-7 rounded-lg object-contain" />
 <h2 className="pixel-font text-[12px] text-ink">News</h2>
 </div>
 <button
 onClick={onClose}
 aria-label="ปิด"
 className="neo-btn w-9 h-9 flex items-center justify-center rounded-lg bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
 >
 <X size={16} strokeWidth={2.5} aria-hidden="true" />
 </button>
 </div>

 {/* Tab bar */}
 <div className="flex border-b border-ink/10">
 {[
            { key: 'camphub', label: 'Camphub' },
            { key: 'rollercoaster', label: 'อัปเดตแอป' },
            { key: 'tcas', label: 'TCAS70' },
          ].map((tab) => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={`flex-1 py-2.5 pixel-font text-[10px] transition-colors relative ${
 activeTab === tab.key
 ? 'text-brand-strong'
 : 'text-ink-soft'
 }`}
 >
 {tab.label}
 {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-strong rounded-t-full" />}
 </button>
 ))}
 </div>

 {/* Camphub category filter */}
 {activeTab === 'camphub' && (
 <div className="shrink-0 border-b border-ink/10 bg-white">
 {/* Group selector */}
 <div className="flex gap-1.5 overflow-x-auto px-4 pt-2.5 pb-2 no-scrollbar">
 {CAMP_GROUPS.map((group) => {
 const isOpen = openGroup === group.key
 const owns = group.items.some((it) => it.slug === category)
 return (
 <button
 key={group.key}
 onClick={() => setOpenGroup(isOpen ? null : group.key)}
 className={`relative shrink-0 flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 ${
 isOpen
 ? 'bg-gradient-to-br from-brand to-brand-strong text-white '
 : owns
 ? 'bg-brand-soft text-brand-strong ring-1 ring-inset ring-brand/30'
 : 'bg-brand-soft text-ink-soft'
 }`}
 >
 <span className="text-[13px] leading-none">{group.icon}</span>
 <span className="pixel-font text-[8px] whitespace-nowrap">{group.label}</span>
 {owns && !isOpen && (
 <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-pink ring-2 ring-white" />
 )}
 </button>
 )
 })}
 </div>

 {/* Sub-category reveal — visually "drops down" from the open group */}
 {openGroup && (
 <div
 key={openGroup}
 className="animate-filter-reveal bg-brand-soft/50 border-t border-brand/20/60 px-4 py-2.5"
 style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
 >
 <div className="flex flex-wrap gap-1.5">
 {CAMP_GROUPS.find((g) => g.key === openGroup)?.items.map((it) => {
 const selected = category === it.slug
 return (
 <button
 key={it.slug}
 onClick={() => setCategory(it.slug)}
 aria-pressed={selected}
 className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 active:scale-95 ${
 selected
 ? 'bg-brand-strong text-white'
 : 'bg-white text-ink-soft border border-ink/10 hover:border-brand hover:text-brand-strong'
 }`}
 >
 {selected && <span className="text-[9px] leading-none">✓</span>}
 {it.label}
 </button>
 )
 })}
 </div>
 </div>
 )}

 {/* Currently viewing — persistent orientation, even when groups are collapsed */}
 <div className="flex items-center gap-1.5 px-4 py-1.5 bg-paper/60 border-t border-ink/10">
 <span className="pixel-font text-[7px] text-ink-soft">กำลังดู</span>
 <span
 className="text-[11px] font-semibold text-brand-strong"
 style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
 >
 {labelForCategory(category)}
 </span>
 </div>
 </div>
 )}

 {/* Camphub Feed */}
 {activeTab === 'camphub' && (
 <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
 {loading ? (
 // Skeleton loading
 <>
 {[1, 2, 3].map((i) => (
 <div
 key={i}
 className="rounded-2xl overflow-hidden border border-ink/10 bg-white animate-pulse"
 >
 <div className="w-full h-36 bg-brand-soft/60" />
 <div className="px-4 py-4 space-y-2">
 <div className="h-4 bg-brand-soft/60 rounded w-3/4" />
 <div className="h-3 bg-brand-soft rounded w-full" />
 </div>
 </div>
 ))}
 </>
 ) : error ? (
 <div className="flex flex-col items-center justify-center py-12 gap-4">
 <span className="text-3xl">⚠️</span>
 <p className="text-sm text-ink-soft text-center">{error}</p>
 <button
 onClick={fetchCamps}
 className="px-4 py-2 text-[11px] rounded-lg bg-brand-soft text-brand-strong hover:bg-brand-soft/80"
 >
 ลองใหม่
 </button>
 </div>
 ) : camps.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 gap-2">
 <span className="text-3xl">📭</span>
 <p className="text-sm text-ink-soft">ไม่พบข้อมูลค่าย</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {camps.map((camp, idx) => (
 <div
 key={idx}
 className="rounded-2xl overflow-hidden border border-ink/10 bg-white"
 >
 {/* Tappable content area → opens link */}
 <button
 onClick={() => openLink(camp.link)}
 className="w-full text-left active:brightness-95 transition-all"
 >
 <img
 src={camp.poster_image || placeholderPoster}
 alt={camp.title}
 className="w-full h-36 object-cover bg-brand-soft/60"
 onError={(e) => {
 e.target.src = placeholderPoster
 }}
 />
 <div className="px-4 pt-3 pb-2">
 <div className="flex items-center gap-1 mb-1">
 <img src={camphubLogo} alt="" className="w-4 h-4 rounded object-contain" />
 <span className="text-[10px] text-brand-strong font-semibold">CAMPHUB</span>
 </div>
 <p className="text-sm font-semibold text-ink leading-snug line-clamp-2">
 {camp.title}
 </p>
 <p className="text-xs text-ink-soft mt-1 leading-relaxed line-clamp-2">
 {camp.small_description}
 </p>
 </div>
 </button>

 {/* Share to chat */}
 <div className="px-4 pb-3 pt-1 border-t border-ink/10 flex justify-end">
 <button
 onClick={() => setSharingItem(camp)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-soft text-brand border border-brand/20 active:scale-95 transition-transform"
 >
 <MessageCircle size={13} strokeWidth={2} />
 <span className="pixel-font text-[7px]">Share to chat</span>
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* App-updates feed (legacy tab key: rollercoaster) */}
 {activeTab === 'rollercoaster' && (
 <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
 {/* Admin: add update button */}
 {isAdmin && (
 <button
 onClick={() => setShowAddForm(true)}
 className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-brand/30 text-brand active:scale-95 transition-transform"
 >
 <Plus size={16} strokeWidth={2.5} />
 <span className="pixel-font text-[8px]">เพิ่มอัปเดต</span>
 </button>
 )}

 {allUpdates.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 gap-2">
 <span className="text-3xl">🎢</span>
 <p className="text-sm text-ink-soft">ยังไม่มีอัปเดต</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {allUpdates.map((u) => {
 const badge = UPDATE_TYPES[u.type] ?? UPDATE_TYPES.update
 return (
 <div
 key={u.id}
 className="rounded-2xl overflow-hidden border border-ink/10 bg-white"
 >
 {/* Tappable area → opens detail sheet */}
 <button
 onClick={() => setDetailUpdate(u)}
 className="w-full text-left active:brightness-95 transition-all"
 >
 {u.image && (
 <img
 src={u.image}
 alt={u.title}
 className="w-full h-36 object-cover bg-brand-soft/60"
 onError={(e) => { e.target.style.display = 'none' }}
 />
 )}
 <div className="px-4 pt-3 pb-2">
 <div className="flex items-center gap-2 mb-1.5">
 <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${badge.color}`}>
 {badge.label}
 </span>
 <span className="text-[10px] text-ink-soft">
 {new Date(u._ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
 </span>
 </div>
 <p className="text-sm font-semibold text-ink leading-snug">{u.title}</p>
 <p className="text-xs text-ink-soft mt-1 leading-relaxed line-clamp-3">{u.description}</p>
 </div>
 </button>

 {/* Actions */}
 <div className="px-4 pb-3 pt-1 border-t border-ink/10 flex justify-end items-center gap-2">
 {isAdmin && u._firestore && (
 <button
 onClick={() => handleDeleteUpdate(u.id)}
 className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-danger/10 text-danger border border-danger/20 active:scale-95 transition-transform"
 >
 <Trash2 size={13} strokeWidth={2} />
 <span className="pixel-font text-[7px]">ลบ</span>
 </button>
 )}
 <button
 onClick={() => setSharingItem({ title: u.title, link: '', poster_image: u.image })}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-soft text-brand border border-brand/20 active:scale-95 transition-transform"
 >
 <MessageCircle size={13} strokeWidth={2} />
 <span className="pixel-font text-[7px]">Share to chat</span>
 </button>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>
 )}

        {/* TCAS70 Calendar Feed */}
        {activeTab === 'tcas' && (
          <div className="flex-1 overflow-y-auto">
            <TcasCalendarTab />
          </div>
        )}

        {/* Add update form (admin) */}
        {showAddForm && <AddUpdateSheet onClose={() => setShowAddForm(false)} />}

 {/* Update detail sheet */}
 {detailUpdate && <UpdateDetailSheet update={detailUpdate} onClose={() => setDetailUpdate(null)} />}

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
