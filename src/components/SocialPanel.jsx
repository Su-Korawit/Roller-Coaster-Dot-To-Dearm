import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Bell, Loader2, MapIcon, MessageCircle, Search, UserCheck, UserPlus, Users, X, Zap } from 'lucide-react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuthStore } from '../stores/useAuthStore'
import { useSocialStore, calculateMatchScore } from '../stores/useSocialStore'
import PublicProfileSheet from './PublicProfileSheet'
import KawaiiMatchOverlay from './KawaiiMatchOverlay'

// ─── MBTI group colours ──────────────────────────────────────────────────────
const MBTI_COLORS = {
  // Analysts
  INTJ: '#7c3aed', INTP: '#7c3aed', ENTJ: '#7c3aed', ENTP: '#7c3aed',
  // Diplomats
  INFJ: '#059669', INFP: '#059669', ENFJ: '#059669', ENFP: '#059669',
  // Sentinels
  ISTJ: '#2563eb', ISFJ: '#2563eb', ESTJ: '#2563eb', ESFJ: '#2563eb',
  // Explorers
  ISTP: '#d97706', ISFP: '#d97706', ESTP: '#d97706', ESFP: '#d97706',
}
const MATCH_THRESHOLD = 70

function mbtiColor(mbti) {
  return MBTI_COLORS[mbti] ?? '#a78bda'
}

// ─── Leaflet custom icons ────────────────────────────────────────────────────
function makeUserIcon(user) {
  const color = mbtiColor(user.mbti)
  const inner = user.photoURL
    ? `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : `<span style="font-size:13px;line-height:1">🎮</span>`
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;border:3px solid ${color};background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${inner}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function makeMyIcon(photoURL) {
  const inner = photoURL
    ? `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : `<span style="font-size:18px;line-height:1">🎮</span>`
  return L.divIcon({
    className: '',
    html: `<div style="width:44px;height:44px;border-radius:50%;border:4px solid #a78bda;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 0 0 5px rgba(167,139,218,0.2),0 0 18px rgba(167,139,218,0.45);">${inner}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

// ─── Google Maps script loader ───────────────────────────────────────────────
let _gmapsLoading = null
function loadGoogleMapsScript() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
  if (!key || key === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_KEY not configured'))
  }
  if (window.google?.maps?.places) return Promise.resolve()
  if (_gmapsLoading) return _gmapsLoading
  _gmapsLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.onload = () => { _gmapsLoading = null; resolve() }
    script.onerror = () => { _gmapsLoading = null; reject(new Error('Google Maps failed to load')) }
    document.head.appendChild(script)
  })
  return _gmapsLoading
}

// ─── SchoolPicker ────────────────────────────────────────────────────────────
function SchoolPicker({ uid, onSaved }) {
  const inputRef = useRef(null)
  const onSavedRef = useRef(onSaved)
  useEffect(() => { onSavedRef.current = onSaved }, [onSaved])

  const [ready, setReady] = useState(!!window.google?.maps?.places)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (ready) return
    loadGoogleMapsScript()
      .then(() => setReady(true))
      .catch((e) => setError(e.message))
  }, [ready])

  useEffect(() => {
    if (!ready || !inputRef.current) return
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment'],
      componentRestrictions: { country: 'th' },
      fields: ['place_id', 'name', 'geometry'],
    })
    const listener = ac.addListener('place_changed', async () => {
      const place = ac.getPlace()
      if (!place?.geometry) return
      setSaving(true)
      setError('')
      try {
        const schoolData = {
          schoolId: place.place_id,
          schoolName: place.name,
          schoolLat: place.geometry.location.lat(),
          schoolLng: place.geometry.location.lng(),
        }
        await updateDoc(doc(db, 'users', uid), schoolData)
        onSavedRef.current(schoolData)
      } catch {
        setError('บันทึกไม่สำเร็จ กรุณาลองใหม่')
        setSaving(false)
      }
    })
    return () => window.google.maps.event.removeListener(listener)
  }, [ready, uid])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 py-8">
      <span className="text-5xl">🏫</span>
      <div className="text-center">
        <p className="pixel-font text-[10px] text-gray-700 leading-relaxed">เลือกโรงเรียน / มหาวิทยาลัย</p>
        <p className="pixel-font text-[7px] text-gray-400 mt-1.5 leading-relaxed">เพื่อดูผู้ใช้ในสถานที่เดียวกัน</p>
      </div>
      {error && (
        <p className="pixel-font text-[7px] text-red-400 text-center leading-relaxed">{error}</p>
      )}
      <div className="relative w-full max-w-xs">
        <input
          ref={inputRef}
          type="text"
          placeholder="พิมพ์ชื่อโรงเรียน / มหาวิทยาลัย..."
          disabled={!ready || saving}
          className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm px-4 py-3 text-[12px] outline-none focus:border-[#a78bda] transition-colors disabled:opacity-50"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
        />
        {(!ready || saving) && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" />
        )}
      </div>
      {!ready && !error && (
        <p className="pixel-font text-[7px] text-gray-400">กำลังโหลด Google Maps...</p>
      )}
    </div>
  )
}

// ─── MapTab ──────────────────────────────────────────────────────────────────
function MapTab({ myProfile, nearbyUsers, uid, onSchoolSaved, onUserTap }) {
  if (!myProfile?.schoolId) {
    return <SchoolPicker uid={uid} onSaved={onSchoolSaved} />
  }

  const center = [myProfile.schoolLat, myProfile.schoolLng]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* School label bar */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center gap-2 shrink-0">
        <span className="text-sm">📍</span>
        <span className="pixel-font text-[8px] text-gray-600 truncate flex-1">{myProfile.schoolName}</span>
        <span className="pixel-font text-[7px] text-purple-400 shrink-0">{nearbyUsers.length} คน</span>
      </div>
      {/* Map — flex-1 with minHeight:0 allows it to shrink in flex column */}
      <div className="flex-1" style={{ minHeight: 0 }}>
        <MapContainer
          center={center}
          zoom={17}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* My marker — at exact school pin, larger glowing ring */}
          <Marker position={center} icon={makeMyIcon(myProfile.photoURL ?? null)}>
            <Popup>
              <span style={{ fontFamily: "'Noto Sans Thai', sans-serif", fontSize: 12 }}>
                <strong>{myProfile.displayName || 'คุณ'}</strong> (ฉัน)
              </span>
            </Popup>
          </Marker>

          {/* Nearby users — spread radially so pins don't overlap */}
          {nearbyUsers.map((u, i) => {
            const angle = (i / Math.max(nearbyUsers.length, 1)) * 2 * Math.PI
            const r = 0.00009
            const pos = [center[0] + Math.sin(angle) * r, center[1] + Math.cos(angle) * r]
            return (
              <Marker
                key={u.uid}
                position={pos}
                icon={makeUserIcon(u)}
                eventHandlers={{ click: () => onUserTap?.(u.uid) }}
              />
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}

// ─── UserCard (Discover tab) ─────────────────────────────────────────────────
function UserCard({ user, following, sentRequests, onFollow, onTap, score = 0, onMatchCheck, checkedMatches = {} }) {
  const [busy, setBusy] = useState(false)
  const isFollowing = following.includes(user.uid)
  const isPending = sentRequests.includes(user.uid)
  const isHighMatch = score >= 80
  const isMatch = score >= 60

  const matchState = checkedMatches[user.uid]
  const isChecking = matchState?.status === 'checking'
  const isMatched  = matchState?.status === 'matched'
  const isNoMatch  = matchState?.status === 'no-match'
  const canRetry   = isNoMatch ? (() => {
    if (!matchState.checkedAt) return true
    return (Date.now() - new Date(matchState.checkedAt).getTime()) >= 24 * 60 * 60 * 1000
  })() : true

  async function handleFollow(e) {
    e.stopPropagation()
    if (isFollowing || isPending || busy) return
    setBusy(true)
    try { await onFollow(user.uid) } finally { setBusy(false) }
  }

  function handleMatch(e) {
    e.stopPropagation()
    if (isChecking || isMatched || (isNoMatch && !canRetry)) return
    onMatchCheck?.(user.uid)
  }

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 border transition-colors cursor-pointer active:brightness-95 ${
        isHighMatch ? 'border-amber-200 bg-amber-50/60'
        : isMatch   ? 'border-purple-200 bg-purple-50/60'
        :             'border-gray-100 bg-gray-50'
      }`}
      onClick={() => onTap?.(user.uid)}
    >
      {/* Avatar with MBTI ring */}
      <div
        className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white border-2"
        style={{ borderColor: mbtiColor(user.mbti) }}
      >
        {user.photoURL
          ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
          : <span className="text-lg">🎮</span>}
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="pixel-font text-[9px] text-gray-800 truncate">{user.displayName || 'ผู้ใช้'}</span>
          {isHighMatch
            ? <span className="pixel-font text-[6px] text-amber-500 shrink-0">⚡ High Match</span>
            : isMatch
              ? <span className="pixel-font text-[6px] text-purple-600 shrink-0">✦ Match</span>
              : null}
        </div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {user.mbti && (
            <span className="pixel-font text-[6px] px-1.5 py-0.5 rounded-md text-white"
              style={{ background: mbtiColor(user.mbti) }}>
              {user.mbti}
            </span>
          )}
          {user.program && (
            <span className="pixel-font text-[6px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 max-w-22.5 truncate">
              {user.program}
            </span>
          )}
        </div>
      </div>

      {/* Match button */}
      <button
        onClick={handleMatch}
        disabled={isChecking || isMatched || (isNoMatch && !canRetry)}
        className={`shrink-0 px-2 py-1.5 rounded-xl pixel-font text-[7px] transition-all active:scale-95 disabled:cursor-not-allowed ${
          isMatched           ? 'bg-amber-400 text-white shadow-sm'
          : isChecking        ? 'bg-purple-100 text-purple-500 animate-pulse'
          : (isNoMatch && !canRetry) ? 'bg-gray-100 text-gray-400'
          : 'border border-[#a78bda] text-[#a78bda]'
        }`}
      >
        {isMatched    ? '⚡ Matched!'
          : isChecking  ? '～ checking'
          : (isNoMatch && !canRetry) ? '✦ Try Again'
          : '✦ Match'}
      </button>

      {/* Follow button */}
      <button
        onClick={handleFollow}
        disabled={busy || isFollowing || isPending}
        className={`shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-xl pixel-font text-[7px] transition-all active:scale-95 disabled:opacity-60 ${
          isFollowing ? 'bg-gray-100 text-gray-500'
          : isPending ? 'bg-amber-50 text-amber-600 border border-amber-200'
          : 'bg-[#a78bda] text-white shadow-sm'
        }`}
      >
        {busy ? <Loader2 size={10} className="animate-spin" />
          : isFollowing ? <UserCheck size={10} />
          : isPending ? 'รอ...'
          : <UserPlus size={10} />}
      </button>
    </div>
  )
}

// ─── DiscoverTab ─────────────────────────────────────────────────────────────
function DiscoverTab({ nearbyUsers, following, sentRequests, sendFollowRequest, onUserTap, myProfile, onMatchCheck, checkedMatches }) {
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const searchResults = useSocialStore((s) => s.searchResults)
  const searchUsers = useSocialStore((s) => s.searchUsers)

  // When a search term is typed, hit Firestore directly so users outside the
  // same school are discoverable. Without a term, fall back to nearbyUsers.
  useEffect(() => {
    if (!search.trim()) { searchUsers(''); return }
    setSearching(true)
    searchUsers(search).finally(() => setSearching(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const base = search.trim() ? searchResults : nearbyUsers
  const scored = base
    .map((u) => ({ ...u, _score: calculateMatchScore(myProfile, u) }))
    .sort((a, b) => b._score - a._score)
  const filtered = scored

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-[#a78bda] transition-colors">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ใช้..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[12px] text-gray-700"
            style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="shrink-0">
              <X size={12} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {searching ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="text-purple-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="text-3xl">{search.trim() ? '🔍' : '🏫'}</span>
            <p className="pixel-font text-[8px] text-gray-400 text-center leading-relaxed">
              {search.trim()
                ? 'ไม่พบผู้ใช้ที่ค้นหา'
                : 'ยังไม่มีผู้ใช้ในโรงเรียนเดียวกัน'}
            </p>
          </div>
        ) : (
          filtered.map((u) => (
            <UserCard
              key={u.uid}
              user={u}
              following={following}
              sentRequests={sentRequests}
              onFollow={sendFollowRequest}
              onTap={onUserTap}
              score={u._score}
              onMatchCheck={onMatchCheck}
              checkedMatches={checkedMatches}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── RequestCard ─────────────────────────────────────────────────────────────
function RequestCard({ user, onAccept, onDecline }) {
  const [busy, setBusy] = useState(null)

  async function handle(action) {
    setBusy(action)
    try {
      if (action === 'accept') await onAccept(user.uid)
      else await onDecline(user.uid)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm">
      <div
        className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-gray-100 border-2"
        style={{ borderColor: mbtiColor(user.mbti) }}
      >
        {user.photoURL
          ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
          : <span className="text-lg">🎮</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="pixel-font text-[9px] text-gray-800 truncate">{user.displayName || 'ผู้ใช้'}</p>
        <div className="flex gap-1 mt-0.5">
          {user.mbti && (
            <span className="pixel-font text-[6px] px-1.5 py-0.5 rounded-md text-white"
              style={{ background: mbtiColor(user.mbti) }}>
              {user.mbti}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={() => handle('accept')}
          disabled={!!busy}
          className="px-2.5 py-1.5 rounded-xl bg-[#a78bda] text-white pixel-font text-[7px] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1"
        >
          {busy === 'accept' ? <Loader2 size={10} className="animate-spin" /> : 'รับ'}
        </button>
        <button
          onClick={() => handle('decline')}
          disabled={!!busy}
          className="px-2.5 py-1.5 rounded-xl bg-gray-100 text-gray-500 pixel-font text-[7px] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1"
        >
          {busy === 'decline' ? <Loader2 size={10} className="animate-spin" /> : 'ปฏิเสธ'}
        </button>
      </div>
    </div>
  )
}

// ─── RequestsTab ─────────────────────────────────────────────────────────────
function RequestsTab({ pendingRequests, acceptFollowRequest, rejectFollowRequest }) {
  const [requestUsers, setRequestUsers] = useState([])
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (pendingRequests.length === 0) {
      setRequestUsers([])
      return
    }
    setResolving(true)
    Promise.all(
      pendingRequests.map(async (uid) => {
        const snap = await getDoc(doc(db, 'users', uid))
        return snap.exists() ? snap.data() : null
      })
    )
      .then((users) => setRequestUsers(users.filter(Boolean)))
      .finally(() => setResolving(false))
  }, [pendingRequests])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
      {resolving && (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="text-purple-400 animate-spin" />
        </div>
      )}
      {!resolving && requestUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <span className="text-3xl">🔔</span>
          <p className="pixel-font text-[8px] text-gray-400">ไม่มีคำขอติดตาม</p>
        </div>
      )}
      {requestUsers.map((u) => (
        <RequestCard
          key={u.uid}
          user={u}
          onAccept={acceptFollowRequest}
          onDecline={rejectFollowRequest}
        />
      ))}
    </div>
  )
}

// ─── MatchedTab ──────────────────────────────────────────────────────────────
function MatchedTab({ onUserTap, onOpenChat, following }) {
  const matches = useSocialStore((s) => s.matches)
  const loadMatches = useSocialStore((s) => s.loadMatches)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMatches().finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

  function tierColor(score) {
    if (score >= 90) return '#EF9F27'
    if (score >= 71) return '#7F77DD'
    return '#378ADD'
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="text-purple-400 animate-spin" />
        </div>
      )}
      {!loading && matches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <span className="text-3xl">⚡</span>
          <p className="pixel-font text-[8px] text-gray-400 text-center leading-relaxed">
            ยังไม่มี Match<br />กด ✦ Match ในแท็บ Discover
          </p>
        </div>
      )}
      {matches.map((m) => {
        const isMutual = following.includes(m.uid)
        const isOld = !m.checkedAt || (Date.now() - new Date(m.checkedAt).getTime()) > sevenDaysMs
        return (
          <div
            key={m.uid}
            className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm cursor-pointer active:brightness-95"
            onClick={() => onUserTap?.(m.uid)}
          >
            <div
              className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-gray-100 border-2"
              style={{ borderColor: mbtiColor(m.user?.mbti) }}
            >
              {m.user?.photoURL
                ? <img src={m.user.photoURL} alt="" className="w-full h-full object-cover" />
                : <span className="text-lg">🎮</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="pixel-font text-[9px] text-gray-800 truncate">{m.user?.displayName || 'ผู้ใช้'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {m.user?.mbti && (
                  <span className="pixel-font text-[6px] px-1.5 py-0.5 rounded-md text-white"
                    style={{ background: mbtiColor(m.user.mbti) }}>
                    {m.user.mbti}
                  </span>
                )}
                {isOld && (
                  <span className="pixel-font text-[6px] text-gray-400">· ✦ Match Again?</span>
                )}
              </div>
            </div>
            {/* Score pill */}
            <span
              className="pixel-font text-[8px] font-bold px-2 py-1 rounded-lg text-white shrink-0"
              style={{ background: tierColor(m.score) }}
            >
              {m.score}%
            </span>
            {/* Chat button (mutual follows only) */}
            {isMutual && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenChat?.(m.uid) }}
                className="shrink-0 p-1.5 rounded-xl bg-[#a78bda]/10 text-[#a78bda] hover:bg-[#a78bda]/20 transition-colors"
              >
                <MessageCircle size={14} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── SocialPanel (main export) ───────────────────────────────────────────────
const TABS = [
  { id: 'map',      label: 'Map',      Icon: MapIcon },
  { id: 'discover', label: 'Discover', Icon: Search  },
  { id: 'requests', label: 'Requests', Icon: Bell    },
  { id: 'matched',  label: 'Matched',  Icon: Zap     },
]

export default function SocialPanel({ onClose, onOpenChat }) {
  const user = useAuthStore((s) => s.user)
  const {
    nearbyUsers,
    following,
    sentRequests,
    pendingRequests,
    loadNearbyUsers,
    loadMyProfile,
    subscribeToRequests,
    sendFollowRequest,
    acceptFollowRequest,
    rejectFollowRequest,
    computeAndSaveMatchScores,
    matchResult,
    clearMatchResult,
    checkAndAnimateMatch,
    checkedMatches,
  } = useSocialStore()

  const [tab, setTab] = useState('map')
  const [myProfile, setMyProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    let active = true

    async function init() {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (!active) return
        if (snap.exists()) {
          const data = snap.data()
          setMyProfile(data)
          if (data.schoolId) {
            await loadNearbyUsers(data.schoolId)
            const nearby = useSocialStore.getState().nearbyUsers
            computeAndSaveMatchScores(data, nearby)
          }
        }
        await loadMyProfile()
      } finally {
        if (active) setLoading(false)
      }
    }

    init()
    const unsub = subscribeToRequests(user.uid)
    return () => { active = false; unsub() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  function handleSchoolSaved(schoolData) {
    setMyProfile((prev) => ({ ...prev, ...schoolData }))
    loadNearbyUsers(schoolData.schoolId)
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden md:max-w-2xl md:mx-auto lg:max-w-3xl"
      style={{ top: '8%' }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <Users size={15} strokeWidth={2} className="text-[#a78bda]" />
          <h2 className="pixel-font text-[11px] text-gray-800">Social</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 text-xl leading-none">x</button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-100 bg-white shrink-0">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = tab === id
          const badge = id === 'requests' ? pendingRequests.length : 0
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors border-b-2 ${
                isActive ? 'text-[#a78bda] border-[#a78bda]' : 'text-gray-400 border-transparent'
              }`}
            >
              <div className="relative">
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-red-500 text-white pixel-font text-[6px] flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="pixel-font text-[6px]">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="text-purple-400 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {tab === 'map' && (
            <MapTab
              myProfile={myProfile}
              nearbyUsers={nearbyUsers}
              uid={user?.uid}
              onSchoolSaved={handleSchoolSaved}
              onUserTap={setSelectedUserId}
            />
          )}
          {tab === 'discover' && (
            <DiscoverTab
              nearbyUsers={nearbyUsers}
              following={following}
              sentRequests={sentRequests}
              sendFollowRequest={sendFollowRequest}
              onUserTap={setSelectedUserId}
              myProfile={myProfile}
              onMatchCheck={checkAndAnimateMatch}
              checkedMatches={checkedMatches}
            />
          )}
          {tab === 'requests' && (
            <RequestsTab
              pendingRequests={pendingRequests}
              acceptFollowRequest={acceptFollowRequest}
              rejectFollowRequest={rejectFollowRequest}
            />
          )}
          {tab === 'matched' && (
            <MatchedTab
              onUserTap={setSelectedUserId}
              onOpenChat={onOpenChat}
              following={following}
            />
          )}
        </div>
      )}

      {/* User profile sheet — rendered inside panel so z-60 stacks above z-50 panel content */}
      {selectedUserId && (
        <PublicProfileSheet
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onOpenChat={onOpenChat}
        />
      )}

      {/* Kawaii match overlay — portaled above everything via fixed positioning */}
      {matchResult && (
        <KawaiiMatchOverlay
          matchResult={matchResult}
          myUser={myProfile}
          onClose={clearMatchResult}
          onOpenChat={(uid) => { clearMatchResult(); onOpenChat?.(uid) }}
          onViewProfile={(uid) => { clearMatchResult(); setSelectedUserId(uid) }}
        />
      )}
    </div>
  )
}
