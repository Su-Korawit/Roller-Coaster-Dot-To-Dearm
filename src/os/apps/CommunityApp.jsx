import { useEffect, useState } from 'react'
import { Search, UserPlus, Check } from 'lucide-react'
import { useSocialStore } from '../../stores/useSocialStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useLifeStore } from '../../stores/useLifeStore'

// Community: find people (by name or school) and send a follow request.
// Shows the user's own target so they can look for people on the same faculty/major.
export default function CommunityApp() {
  const uid = useAuthStore((s) => s.user?.uid)
  const target = useLifeStore((s) => s.target)
  const { searchResults, sentRequests, following, searchUsers, sendFollowRequest, subscribeToRequests } = useSocialStore()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) return undefined
    const off = subscribeToRequests(uid)
    return () => { if (typeof off === 'function') off() }
  }, [uid, subscribeToRequests])

  async function run(term) {
    setError('')
    try { await searchUsers(term) } catch { setError('ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง') }
  }

  async function follow(targetUid) {
    setError('')
    try { await sendFollowRequest(targetUid) } catch { setError('ส่งคำขอไม่สำเร็จ ลองใหม่อีกครั้ง') }
  }

  if (!uid) {
    return <p className="thai-font text-sm text-ink-soft p-6">เข้าสู่ระบบเพื่อใช้งานชุมชน</p>
  }

  const mine = [target.faculty, target.major].filter(Boolean).join(' / ')

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      {mine && (
        <p className="thai-font text-sm px-card p-3 bg-brand-soft">
          เป้าหมายของคุณ: <b>{mine}</b> — ลองค้นหาเพื่อนที่สนใจเหมือนกัน
        </p>
      )}
      <form onSubmit={(e) => { e.preventDefault(); run(query) }} className="px-input flex items-center gap-2 px-3 h-11">
        <Search size={18} className="text-ink-soft shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อหรือโรงเรียน"
          aria-label="ค้นหาผู้ใช้"
          className="thai-font text-sm flex-1 bg-transparent outline-none text-ink placeholder:text-ink-soft"
        />
      </form>
      {error && <p role="alert" className="thai-font text-sm text-zone-health-deep">{error}</p>}
      {searchResults.length === 0 && <p className="thai-font text-sm text-ink-soft text-center py-6">พิมพ์ชื่อแล้วกด Enter เพื่อหาเพื่อน</p>}
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
