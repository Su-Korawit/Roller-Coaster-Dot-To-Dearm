import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { Flame, Lock, Loader2, MessageCircle, UserCheck, UserPlus } from 'lucide-react'
import { db } from '../firebase'
import { useAuthStore } from '../stores/useAuthStore'
import { useSocialStore, calculateMatchScore } from '../stores/useSocialStore'
import { shapes } from '../lib/db'
import { mbtiColor } from '../constants/mbtiColors'

// ─── Match score bar — pixel-art segmented style ─────────────────────────────
function MatchBar({ score }) {
  // Animate fill from 0 → score after a short delay so the transition plays
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setFilled(true), 200)
    return () => clearTimeout(id)
  }, [])

  const label = score >= 80 ? '⚡ High Match' : score >= 60 ? '✦ Match' : 'Match Score'
  const labelColor = score >= 80 ? '#d97706' : score >= 60 ? 'var(--color-brand)' : '#9ca3af'
  const segmentColor = score >= 80 ? '#f59e0b' : score >= 60 ? 'var(--color-brand)' : '#c084fc'

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="pixel-font text-[7px]" style={{ color: labelColor }}>{label}</span>
        <span className="pixel-font text-[8px]" style={{ color: labelColor }}>{score}%</span>
      </div>
      {/* 10-segment pixel bar — each block lights up with a staggered delay */}
      <div className="flex gap-0.5 h-3.5">
        {Array.from({ length: 10 }, (_, i) => {
          const segmentThreshold = (i + 1) * 10
          const isLit = filled && score >= segmentThreshold
          return (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                background: isLit ? segmentColor : '#e5e7eb',
                transition: `background 0.12s ease`,
                transitionDelay: isLit ? `${i * 55}ms` : '0ms',
                boxShadow: isLit && score >= 60 ? `0 0 4px ${segmentColor}80` : 'none',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Stat cell ────────────────────────────────────────────────────────────────
function StatCell({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="pixel-font text-[11px] text-gray-800">{value}</span>
      <span className="pixel-font text-[6px] text-gray-400">{label}</span>
    </div>
  )
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────
function Tag({ label, color = 'bg-gray-100 text-gray-600', blurred }) {
  return (
    <span
      className={`inline-flex items-center gap-1 pixel-font text-[7px] px-2 py-1 rounded-lg ${color} ${blurred ? 'select-none' : ''}`}
      style={blurred ? { filter: 'blur(5px)', userSelect: 'none' } : undefined}
    >
      {label}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function UserProfileSheet({ userId, onClose, onOpenChat }) {
  const currentUser = useAuthStore((s) => s.user)
  const following = useSocialStore((s) => s.following)
  const followers = useSocialStore((s) => s.followers)
  const sentRequests = useSocialStore((s) => s.sentRequests)
  const sendFollowRequest = useSocialStore((s) => s.sendFollowRequest)

  const [profile, setProfile] = useState(null)
  const [myProfileDoc, setMyProfileDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [followBusy, setFollowBusy] = useState(false)
  // Trigger slide-up on next frame so the transition actually plays
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Fetch target user profile + own profile (for match scoring)
  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setError('')
    Promise.all([
      getDoc(doc(db, 'users', userId)),
      currentUser?.uid ? getDoc(doc(db, 'users', currentUser.uid)) : Promise.resolve(null),
    ])
      .then(([snap, mySnap]) => {
        if (snap.exists()) setProfile(snap.data())
        else setError('ไม่พบผู้ใช้')
        if (mySnap?.exists()) setMyProfileDoc(mySnap.data())
      })
      .catch(() => setError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [userId, currentUser?.uid])

  // Relationship state
  const iFollow = following.includes(userId)
  const theyFollow = followers.includes(userId)
  const isMutual = iFollow && theyFollow
  const isPending = sentRequests.includes(userId)
  const isSelf = currentUser?.uid === userId

  // Privacy: blur program/mastery if private and not following
  const isPrivate = profile?.isPrivate === true
  const canSeeDetails = !isPrivate || iFollow || isSelf

  // Profile fields through the canonical shape seam (handles legacy top-level docs)
  const { mbti: pMbti, program: pProgram, university: pUniversity, masteryTrack: pMastery } =
    shapes.readProfile(profile)

  async function handleFollow() {
    if (iFollow || isPending || isSelf) return
    setFollowBusy(true)
    try { await sendFollowRequest(userId) } finally { setFollowBusy(false) }
  }

  return (
    <div className="absolute inset-0 z-60 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-4xl shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-out"
        style={{
          maxHeight: '85%',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-purple-400 animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-3xl">😕</span>
            <p className="pixel-font text-[8px] text-gray-400">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && profile && (
          <div className="overflow-y-auto flex-1 px-5 pb-6 pt-2">

            {/* ── Avatar + Name + MBTI ── */}
            <div className="flex flex-col items-center gap-2.5 mb-5">
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-gray-100 shrink-0"
                style={{
                  border: `4px solid ${mbtiColor(pMbti)}`,
                  boxShadow: `0 0 0 3px ${mbtiColor(pMbti)}22`,
                }}
              >
                {profile.photoURL
                  ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                  : <span className="text-4xl">🎮</span>}
              </div>

              {/* Name */}
              <p className="pixel-font text-[12px] text-gray-800 text-center">
                {profile.displayName || 'ผู้ใช้'}
              </p>

              {/* MBTI badge */}
              {pMbti && (
                <span
                  className="pixel-font text-[8px] px-3 py-1 rounded-xl text-white"
                  style={{ background: mbtiColor(pMbti) }}
                >
                  {pMbti}
                </span>
              )}
            </div>

            {/* ── Stats row ── */}
            <div className="flex items-center justify-around bg-gray-50 rounded-2xl px-4 py-3 mb-4 border border-gray-100">
              <StatCell value={(profile.followers ?? []).length} label="Followers" />
              <div className="w-px h-6 bg-gray-200" />
              <StatCell value={(profile.following ?? []).length} label="Following" />
              <div className="w-px h-6 bg-gray-200" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="pixel-font text-[11px] text-orange-500 flex items-center gap-1">
                  <Flame size={12} />
                  {profile.fireStacks ?? 0}
                </span>
                <span className="pixel-font text-[6px] text-gray-400">Stacks</span>
              </div>
            </div>

            {/* ── Program / University / Mastery tags ── */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {pProgram && (
                <Tag
                  label={canSeeDetails ? pProgram : '████████'}
                  color="bg-blue-50 text-blue-700"
                  blurred={!canSeeDetails}
                />
              )}
              {pUniversity && (
                <Tag
                  label={canSeeDetails ? pUniversity : '████████'}
                  color="bg-purple-50 text-purple-700"
                  blurred={!canSeeDetails}
                />
              )}
              {pMastery && (
                <Tag
                  label={canSeeDetails ? pMastery : '████'}
                  color="bg-amber-50 text-amber-700"
                  blurred={!canSeeDetails}
                />
              )}
              {!canSeeDetails && (
                <span className="inline-flex items-center gap-1 pixel-font text-[7px] px-2 py-1 rounded-lg bg-gray-100 text-gray-500">
                  <Lock size={9} /> Private
                </span>
              )}
            </div>

            {/* ── Match score bar (mutual only, computed from both profiles) ── */}
            {isMutual && !isSelf && (
              <div className="bg-purple-50 rounded-2xl px-4 py-3 mb-4 border border-purple-100">
                <MatchBar score={calculateMatchScore(myProfileDoc, profile)} />
              </div>
            )}

            {/* ── Action buttons ── */}
            {!isSelf && (
              <div className="flex gap-3">
                {/* Follow / Pending / Following */}
                <button
                  onClick={handleFollow}
                  disabled={followBusy || iFollow || isPending}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl pixel-font text-[8px] transition-all active:scale-95 disabled:opacity-60 ${
                    iFollow
                      ? 'bg-gray-100 text-gray-500'
                      : isPending
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'bg-brand text-white shadow-md'
                  }`}
                >
                  {followBusy
                    ? <Loader2 size={12} className="animate-spin" />
                    : iFollow
                      ? <><UserCheck size={12} /> ติดตามแล้ว</>
                      : isPending
                        ? 'รอดำเนินการ'
                        : <><UserPlus size={12} /> ติดตาม</>}
                </button>

                {/* Message — enabled only if mutually following */}
                <button
                  onClick={() => isMutual && onOpenChat?.(userId)}
                  disabled={!isMutual}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl pixel-font text-[8px] transition-all active:scale-95 ${
                    isMutual
                      ? 'bg-white border-2 border-brand text-brand shadow-sm'
                      : 'bg-gray-50 border border-gray-200 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <MessageCircle size={12} />
                  {isMutual ? 'ข้อความ' : 'ข้อความ 🔒'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
