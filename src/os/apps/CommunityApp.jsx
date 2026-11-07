import { useEffect, useMemo, useState } from 'react'
import { Search, Heart, Trash2, ArrowLeft, ImagePlus, MessageCircle, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useFeedStore } from '../../stores/useFeedStore'
import ProfileAvatar from '../ProfileAvatar'
import { findApp } from '../apps'
import { MAX_POST, filterFeed, searchFeed, rankFeed, countLikes, profileStats } from '../feedLogic'

const KINDS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'text', label: 'ข้อความ' },
  { id: 'media', label: 'สื่อ' },
]

function ago(ms) {
  if (!ms) return ''
  const m = Math.floor((Date.now() - ms) / 60000)
  if (m < 1) return 'เมื่อสักครู่'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h} ชม.ที่แล้ว` : `${Math.floor(h / 24)} วันที่แล้ว`
}

function Initial({ name, size = 36 }) {
  return (
    <span className="rounded-full bg-brand-soft text-brand-strong font-display font-bold flex items-center justify-center shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  )
}

// Author picture: your own is your OS avatar; other people show their initial (avatars live on each device).
function Author({ user, post, size }) {
  return post.uid === user.uid ? <ProfileAvatar user={user} size={size} /> : <Initial name={post.name} size={size} />
}

function PostCard({ post, user, likeCount, liked, onLike, onRemove, onProfile }) {
  return (
    <li className="px-card p-3 bg-paper flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onProfile(post.uid)} aria-label={`ดูโปรไฟล์ ${post.name}`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <Author user={user} post={post} size={36} />
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <button type="button" onClick={() => onProfile(post.uid)} className="thai-font text-sm font-bold truncate block max-w-full text-left">{post.uid === user.uid ? `${post.name} (คุณ)` : post.name}</button>
          <span className="thai-font text-xs text-ink-soft">{ago(post.createdAtMs)}</span>
        </div>
        {post.uid === user.uid && (
          <button type="button" onClick={() => onRemove(post.id)} aria-label="ลบโพสต์" className="p-1.5 text-ink-soft"><Trash2 size={15} /></button>
        )}
      </div>
      <p className="thai-font text-sm whitespace-pre-wrap break-words">{post.text}</p>
      {post.imageUrl && (
        <img src={post.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full max-h-72 object-cover rounded-ui border-2 border-line-soft" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      )}
      <button
        type="button"
        onClick={() => onLike(post.id)}
        aria-pressed={liked}
        aria-label={`${liked ? 'เลิกถูกใจ' : 'ถูกใจ'} (${likeCount})`}
        className={`self-start px-btn px-3 py-1 thai-font text-xs font-bold flex items-center gap-1.5 ${liked ? 'bg-brand-strong text-white' : 'bg-paper'}`}
      >
        <Heart size={14} className={liked ? 'fill-current' : ''} aria-hidden="true" /> {likeCount}
      </button>
    </li>
  )
}

function Composer({ user }) {
  const submit = useFeedStore((s) => s.submit)
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [showImage, setShowImage] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function post(e) {
    e.preventDefault()
    setBusy(true)
    const out = await submit({ text, imageUrl })
    setBusy(false)
    setErr(out ?? '')
    if (!out) { setText(''); setImageUrl(''); setShowImage(false) }
  }

  return (
    <form onSubmit={post} className="px-card p-3 bg-paper flex flex-col gap-2" aria-label="เขียนโพสต์">
      <div className="flex gap-2">
        <ProfileAvatar user={user} size={36} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_POST))}
          rows={2}
          placeholder="วันนี้เป็นยังไงบ้าง แชร์ให้เพื่อนฟังหน่อย"
          aria-label="โพสต์ของคุณ"
          className="px-input px-3 py-2 text-sm flex-1 min-w-0 resize-none thai-font"
        />
      </div>
      {showImage && (
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="ลิงก์รูป (https://...)" aria-label="ลิงก์รูป" className="px-input h-9 px-3 text-sm" />
      )}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setShowImage((v) => !v)} aria-pressed={showImage} className="px-btn px-2.5 py-1.5 thai-font text-xs font-bold bg-paper flex items-center gap-1.5">
          <ImagePlus size={14} aria-hidden="true" /> รูป
        </button>
        <span className="thai-font text-xs text-ink-soft">{text.length}/{MAX_POST}</span>
        <button type="submit" disabled={busy || !text.trim()} className="ml-auto px-btn px-4 py-1.5 thai-font text-sm font-bold bg-brand-strong text-white disabled:opacity-50">โพสต์</button>
      </div>
      {err && <p role="alert" className="thai-font text-sm text-zone-health-deep">{err}</p>}
    </form>
  )
}

// Community: a small social app. Opens on the Feed (liked + recent posts first), with a composer, a
// search box, a profile page per person, and a shortcut to the Chat app.
export default function CommunityApp({ onOpenApp }) {
  const user = useAuthStore((s) => s.user)
  const { posts, likes, loading, error, load, toggleLike, remove } = useFeedStore()
  const [kind, setKind] = useState('all')
  const [query, setQuery] = useState('')
  const [profileUid, setProfileUid] = useState(null)

  useEffect(() => { if (user) load() }, [user, load])

  const likeCounts = useMemo(() => countLikes(likes), [likes])
  const feed = useMemo(() => rankFeed(searchFeed(filterFeed(posts, kind), query), likeCounts), [posts, kind, query, likeCounts])
  const chat = findApp('chat')

  if (!user) return <p className="thai-font text-sm text-ink-soft p-6">เข้าสู่ระบบเพื่อใช้งานชุมชน</p>

  const renderPost = (p) => (
    <PostCard
      key={p.id} post={p} user={user} likeCount={likeCounts[p.id] ?? 0}
      liked={likes.some((l) => l.postId === p.id && l.uid === user.uid)}
      onLike={toggleLike} onRemove={remove} onProfile={setProfileUid}
    />
  )

  if (profileUid) {
    const mine = profileUid === user.uid
    const theirs = posts.filter((p) => p.uid === profileUid).sort((a, b) => b.createdAtMs - a.createdAtMs)
    const name = mine ? (user.displayName || 'ผู้ใช้') : (theirs[0]?.name ?? 'ผู้ใช้')
    const stats = profileStats(posts, profileUid, likeCounts)
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
        <button type="button" onClick={() => setProfileUid(null)} className="self-start thai-font text-sm font-semibold text-brand-strong inline-flex items-center gap-1">
          <ArrowLeft size={16} aria-hidden="true" /> ฟีด
        </button>
        <section className="px-card p-4 bg-brand-soft flex items-center gap-4" aria-label="โปรไฟล์">
          {mine ? <ProfileAvatar user={user} size={72} /> : <Initial name={name} size={72} />}
          <div className="min-w-0">
            <h3 className="thai-font font-bold text-lg truncate">{name}{mine ? ' (คุณ)' : ''}</h3>
            <p className="thai-font text-sm text-ink-soft">{stats.posts} โพสต์ · {stats.likes} ถูกใจ</p>
          </div>
        </section>
        {theirs.length === 0 && <p className="thai-font text-sm text-ink-soft text-center py-6">ยังไม่มีโพสต์</p>}
        <ul className="flex flex-col gap-3">{theirs.map(renderPost)}</ul>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setProfileUid(user.uid)} aria-label="โปรไฟล์ของฉัน" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <ProfileAvatar user={user} size={40} />
        </button>
        <label className="px-input flex items-center gap-2 px-3 h-10 flex-1 min-w-0">
          <Search size={16} className="text-ink-soft shrink-0" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาโพสต์หรือชื่อ" aria-label="ค้นหา" className="thai-font text-sm flex-1 min-w-0 bg-transparent outline-none text-ink placeholder:text-ink-soft" />
        </label>
        <button type="button" onClick={load} disabled={loading} aria-label="โหลดฟีดใหม่" className="p-2 rounded-ui hover:bg-mist disabled:opacity-50"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
        {chat && onOpenApp && (
          <button type="button" onClick={() => onOpenApp(chat)} aria-label="เปิดแชต" className="px-btn w-10 h-10 flex items-center justify-center bg-paper"><MessageCircle size={18} /></button>
        )}
      </div>

      <Composer user={user} />

      <div className="flex gap-2" role="tablist" aria-label="ประเภทโพสต์">
        {KINDS.map((k) => (
          <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} onClick={() => setKind(k.id)} className={`px-btn px-3 py-1 thai-font text-xs font-bold ${kind === k.id ? 'bg-brand-strong text-white' : 'bg-paper'}`}>{k.label}</button>
        ))}
      </div>

      {error && <p role="alert" className="thai-font text-sm text-zone-health-deep">{error}</p>}
      {!loading && feed.length === 0 && !error && (
        <p className="thai-font text-sm text-ink-soft text-center py-8">{query ? 'ไม่พบโพสต์ที่ค้นหา' : 'ยังไม่มีโพสต์ เป็นคนแรกที่โพสต์เลย'}</p>
      )}
      <ul className="flex flex-col gap-3">{feed.map(renderPost)}</ul>
    </div>
  )
}
