import { useEffect, useState } from 'react'
import { getDoc } from 'firebase/firestore'
import { Flame, Lock, Loader2, MessageCircle, UserCheck, UserPlus } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'
import { useSocialStore, calculateMatchScore } from '../stores/useSocialStore'
import { refs, shapes } from '../lib/db'
import { mbtiColor } from '../constants/mbtiColors'
import Popup from './ui/Popup'

// ─── Match score bar — pixel-art segmented style ─────────────────────────────
function MatchBar({ score }) {
  // Animate fill from 0 → score after a short delay so the transition plays
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setFilled(true), 200)
    return () => clearTimeout(id)
  }, [])

  const label = score >= 80 ? '⚡ High Match' : score >= 60 ? '✦ Match' : 'Match Score'
  const labelColor = score >= 80 ? 'var(--color-warn-strong)' : score >= 60 ? 'var(--color-brand)' : 'var(--color-ink-soft)'
  const segmentColor = score >= 80 ? 'var(--color-warn)' : score >= 60 ? 'var(--color-brand)' : 'var(--color-zone-soc)'

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="pixel-font text-xs" style={{ color: labelColor }}>{label}</span>
        <span className="pixel-font text-xs" style={{ color: labelColor }}>{score}%</span>
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
                background: isLit ? segmentColor : 'var(--color-hairline)',
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
      <span className="pixel-font text-xs text-ink">{value}</span>
      <span className="pixel-font text-xs text-ink-soft">{label}</span>
    </div>
  )
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────
function Tag({ label, color = 'bg-brand-soft text-ink-soft', blurred }) {
  return (
    <span
      className={`inline-flex items-center gap-1 pixel-font text-xs px-2 py-1 rounded-lg ${color} ${blurred ? 'select-none' : ''}`}
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
      getDoc(refs.user(userId)),
      currentUser?.uid ? getDoc(refs.user(currentUser.uid)) : Promise.resolve(null),
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
    <Popup variant="sheet" size="md" maxHeight="max-h-[85vh]" onClose={onClose}>
      <div
        className="flex flex-col h-full overflow-hidden transition-transform duration-300 ease-out"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
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
            <p className="pixel-font text-xs text-ink-soft">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && profile && (
          <div className="overflow-y-auto flex-1 px-5 pb-6 pt-2">

            {/* ── Avatar + Name + MBTI ── */}
            <div className="flex flex-col items-center gap-2.5 mb-5">
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-brand-soft shrink-0"
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
              <p className="pixel-font text-[12px] text-ink text-center">
                {profile.displayName || 'ผู้ใช้'}
              </p>

              {/* MBTI badge */}
              {pMbti && (
                <span
                  className="pixel-font text-xs px-3 py-1 rounded-xl text-white"
                  style={{ background: mbtiColor(pMbti) }}
                >
                  {pMbti}
                </span>
              )}
            </div>

            {/* ── Stats row ── */}
            <div className="flex items-center justify-around bg-brand-soft rounded-2xl px-4 py-3 mb-4 border border-ink/10">
              <StatCell value={(profile.followers ?? []).length} label="Followers" />
              <div className="w-px h-6 bg-ink/10" />
              <StatCell value={(profile.following ?? []).length} label="Following" />
              <div className="w-px h-6 bg-ink/10" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="pixel-font text-xs text-warn flex items-center gap-1">
                  <Flame size={12} />
                  {profile.fireStacks ?? 0}
                </span>
                <span className="pixel-font text-xs text-ink-soft">Stacks</span>
              </div>
            </div>

            {/* ── Program / University / Mastery tags ── */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {pProgram && (
                <Tag
                  label={canSeeDetails ? pProgram : '████████'}
                  color="bg-brand-soft text-brand-strong"
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
                <span className="inline-flex items-center gap-1 pixel-font text-xs px-2 py-1 rounded-lg bg-brand-soft text-ink-soft">
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
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl pixel-font text-xs transition-all active:scale-95 disabled:opacity-60 ${
                    iFollow
                      ? 'bg-brand-soft text-ink-soft'
                      : isPending
                        ? 'bg-warn/10 text-warn border border-warn/30'
                        : 'bg-brand text-white shadow-hard-sm'
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
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl pixel-font text-xs transition-all active:scale-95 ${
                    isMutual
                      ? 'bg-paper border-2 border-brand text-brand shadow-hard-sm'
                      : 'bg-brand-soft border border-ink/10 text-ink-soft/50 cursor-not-allowed'
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
    </Popup>
  )
}
