import { useEffect, useState } from 'react'
import { getDoc } from 'firebase/firestore'
import { ArrowLeft, Loader2, Lock, MessageCircle, UserCheck, UserPlus } from 'lucide-react'
import { refs, shapes } from '../lib/db'
import { useAuthStore } from '../stores/useAuthStore'
import { useSocialStore, calculateMatchScore } from '../stores/useSocialStore'
import { universities } from '../data/onboardingData'
import { tcasLogoUrl } from '../hooks/useMytcas'
import { mbtiColor } from '../constants/mbtiColors'
import Popup from './ui/Popup'

function MatchScoreBar({ score }) {
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setFilled(true), 200)
    return () => clearTimeout(id)
  }, [])

  let barGradient, label
  if (score >= 90) {
    barGradient = 'linear-gradient(90deg, var(--color-warn), var(--color-warn))'
    label = '✦ Gold Match'
  } else if (score >= 71) {
    barGradient = 'linear-gradient(90deg, var(--color-brand-strong), var(--color-brand))'
    label = '✦ High Match'
  } else if (score >= 41) {
    barGradient = 'linear-gradient(90deg, var(--color-good-strong), var(--color-leaf))'
    label = 'Match Score'
  } else {
    barGradient = 'linear-gradient(90deg, var(--color-line-soft), var(--color-hairline))'
    label = 'Match Score'
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="pixel-font text-xs text-ink-soft">{label}</span>
        <span className="pixel-font text-xs text-ink">{score}%</span>
      </div>
      <div className="h-3 bg-brand-soft rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: filled ? `${score}%` : '0%', background: barGradient }}
        />
      </div>
    </div>
  )
}

function PortfolioCirclePublic({ label, emoji, image, canSee }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <div
          className={`w-16 h-16 rounded-full overflow-hidden bg-brand-soft flex items-center justify-center border-2 border-line/50 transition-all ${
            !canSee ? 'blur-sm' : ''
          }`}
        >
          {image
            ? <img src={image} alt={label} className="w-full h-full object-cover" />
            : <span className="text-2xl">{emoji}</span>}
        </div>
        {!canSee && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock size={16} className="text-ink-soft" />
          </div>
        )}
      </div>
      <span className={`pixel-font text-xs ${canSee ? 'text-ink-soft' : 'text-ink-soft/50'}`}>
        {label}
      </span>
    </div>
  )
}

const PORTFOLIO_ITEMS = [
  { key: 'mastery',    label: 'Mastery',    emoji: '⚡' },
  { key: 'career',     label: 'Career',     emoji: '💼' },
  { key: 'university', label: 'University', emoji: '🎓' },
]

export default function PublicProfileSheet({ userId, onClose, onOpenChat }) {
  const currentUser = useAuthStore((s) => s.user)
  const following = useSocialStore((s) => s.following)
  const followers = useSocialStore((s) => s.followers)
  const sentRequests = useSocialStore((s) => s.sentRequests)
  const sendFollowRequest = useSocialStore((s) => s.sendFollowRequest)
  const unfollowUser = useSocialStore((s) => s.unfollowUser)

  const [profile, setProfile] = useState(null)
  const [myProfileDoc, setMyProfileDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [followBusy, setFollowBusy] = useState(false)
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)

  // Slide-up animation
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

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

  const iFollow = following.includes(userId)
  const theyFollow = followers.includes(userId)
  const isMutual = iFollow && theyFollow
  const isPending = sentRequests.includes(userId)
  const isSelf = currentUser?.uid === userId

  // Chat button slides in when mutual
  const [chatVisible, setChatVisible] = useState(false)
  useEffect(() => {
    if (isMutual) {
      const id = setTimeout(() => setChatVisible(true), 50)
      return () => clearTimeout(id)
    } else {
      setChatVisible(false)
    }
  }, [isMutual])

  function canSeeItem(key) {
    const defaults = { public: false, followers: true }
    const pItem = { ...defaults, ...(profile?.privacy?.[key] ?? {}) }
    return iFollow ? pItem.followers : pItem.public
  }

  async function handleFollow() {
    if (iFollow || isPending || isSelf) return
    setFollowBusy(true)
    try { await sendFollowRequest(userId) } finally { setFollowBusy(false) }
  }

  async function handleUnfollow() {
    setFollowBusy(true)
    try {
      await unfollowUser(userId)
      setShowUnfollowConfirm(false)
    } finally {
      setFollowBusy(false)
    }
  }

  function handleChat() {
    onOpenChat?.(userId)
    onClose()
  }

  const matchScore = (isMutual && !isSelf) ? calculateMatchScore(myProfileDoc, profile) : 0
  const journeys = profile?.journeys?.mastery || []

  // University logo comes from onboarding data (not portfolioData) — resolve it
  // from the stored university id as a fallback, mirroring ProfilePanel.
  // Prefer profile.profile.university (synced on every login) over the
  // top-level field (written once at signup and may be stale).
  const { mbti: profileMbti, university: uniId } = shapes.readProfile(profile)
  const universityLogo = universities.find((u) => u.id === uniId)?.image || (uniId ? tcasLogoUrl(uniId) : null)

  return (
    <Popup variant="sheet" size="md" maxHeight="max-h-[90vh]" onClose={onClose}>
      <div
        className="flex flex-col h-full overflow-hidden transition-transform duration-300 ease-out"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Back header */}
        <div className="flex items-center px-4 pb-2 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-ink-soft hover:text-ink pixel-font text-xs"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-brand animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-3xl">😕</span>
            <p className="pixel-font text-xs text-ink-soft">{error}</p>
          </div>
        )}

        {!loading && profile && (
          <div className="overflow-y-auto flex-1 px-5 pb-8 space-y-4">

            {/* Avatar + Name + Bio */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="rounded-full overflow-hidden flex items-center justify-center bg-brand-soft shrink-0"
                style={{
                  width: 72,
                  height: 72,
                  border: `3px solid ${mbtiColor(profileMbti)}`,
                  boxShadow: `0 0 0 3px ${mbtiColor(profileMbti)}22`,
                }}
              >
                {profile.photoURL
                  ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-ink-soft">
                      {(profile.displayName || '?').charAt(0).toUpperCase()}
                    </span>}
              </div>

              <p className="pixel-font text-[12px] text-ink text-center">
                {profile.displayName || 'ผู้ใช้'}
              </p>

              {(profile.bio || profileMbti) && (
                <p className="thai-font text-xs text-ink-soft text-center leading-snug max-w-[220px]">
                  {profile.bio || `MBTI: ${profileMbti}`}
                </p>
              )}
            </div>

            {/* Action buttons */}
            {!isSelf && (
              <div className="flex gap-2.5 items-center">
                <button
                  onClick={iFollow ? () => setShowUnfollowConfirm(true) : handleFollow}
                  disabled={followBusy || isPending}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl pixel-font text-xs transition-all active:scale-95 disabled:opacity-60 ${
                    iFollow
                      ? 'bg-paper border-2 border-line/40 text-ink-soft'
                      : isPending
                        ? 'bg-warn/10 text-warn border border-warn/30'
                        : 'bg-brand text-white shadow-hard-sm'
                  }`}
                >
                  {followBusy
                    ? <Loader2 size={12} className="animate-spin" />
                    : iFollow
                      ? <><UserCheck size={12} /> Following ✓</>
                      : isPending
                        ? 'Pending...'
                        : <><UserPlus size={12} /> Follow</>}
                </button>

                {/* Chat button — animates in when mutually following */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{ maxWidth: chatVisible ? '160px' : '0', opacity: chatVisible ? 1 : 0 }}
                >
                  <button
                    onClick={handleChat}
                    className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-brand text-white pixel-font text-xs shadow-md whitespace-nowrap"
                  >
                    <MessageCircle size={12} />
                    Chat
                  </button>
                </div>
              </div>
            )}

            {/* Unfollow confirmation */}
            {showUnfollowConfirm && (
              <div className="bg-danger/10 rounded-2xl p-4 border border-danger/30 space-y-3">
                <p className="thai-font text-sm text-ink text-center">ยกเลิกการติดตาม?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowUnfollowConfirm(false)}
                    className="flex-1 py-2 rounded-xl border-2 border-line/30 text-ink-soft text-sm thai-font"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleUnfollow}
                    disabled={followBusy}
                    className="flex-1 py-2 rounded-xl bg-danger/100 text-white text-sm disabled:opacity-60 flex items-center justify-center"
                  >
                    {followBusy ? <Loader2 size={14} className="animate-spin" /> : 'Unfollow'}
                  </button>
                </div>
              </div>
            )}

            {/* Match Score — mutual only */}
            {isMutual && !isSelf && (
              <div className="bg-brand-soft rounded-2xl px-4 py-3 border border-line/30">
                <MatchScoreBar score={matchScore} />
              </div>
            )}

            {/* Portfolio */}
            <div>
              <p className="pixel-font text-xs text-ink-soft mb-3">Portfolio</p>
              <div className="flex justify-around">
                {PORTFOLIO_ITEMS.map(({ key, label, emoji }) => {
                  const visible = canSeeItem(key)
                  let image = profile?.portfolioData?.[key]?.image || null
                  if (!image && key === 'university') image = universityLogo
                  return (
                    <PortfolioCirclePublic
                      key={key}
                      label={label}
                      emoji={emoji}
                      image={visible ? image : null}
                      canSee={visible}
                    />
                  )
                })}
              </div>
            </div>

            {/* Journey of Mastery */}
            <div>
              <p className="pixel-font text-xs text-ink-soft mb-2">Journey of Mastery</p>

              {!canSeeItem('journey') ? (
                <div className="bg-brand-soft rounded-2xl py-6 flex flex-col items-center gap-2 border-2 border-line/30">
                  <Lock size={20} className="text-ink-soft/50" />
                  <p className="thai-font text-xs text-ink-soft">🔒 Journey เป็น private</p>
                </div>
              ) : journeys.length === 0 ? (
                <div className="bg-brand-soft rounded-2xl py-5 flex items-center justify-center border-2 border-line/30">
                  <p className="thai-font text-xs text-ink-soft">ยังไม่มีข้อมูล Journey</p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {journeys.map((item) => {
                    const credited = (item.progressNotes || []).filter((n) => n?.creditedFriend)
                    return (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-20 h-20 rounded-xl bg-brand-soft border border-line/30 flex flex-col items-center justify-center p-2 gap-1"
                      >
                        <span className="thai-font text-xs font-semibold text-ink text-center leading-tight line-clamp-2">
                          {item.title || '—'}
                        </span>
                        {credited.length > 0 && (
                          <div className="flex items-center justify-center">
                            {credited.slice(0, 3).map((c, i) => (
                              <div
                                key={i}
                                className="w-3.5 h-3.5 rounded-full overflow-hidden border border-white bg-mist shrink-0"
                                style={{ marginLeft: i > 0 ? '-5px' : 0, zIndex: credited.length - i }}
                              >
                                {c.creditedFriend.photoURL
                                  ? <img src={c.creditedFriend.photoURL} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-xs flex items-center justify-center w-full h-full">👤</span>}
                              </div>
                            ))}
                            {credited.length > 3 && (
                              <div
                                className="w-3.5 h-3.5 rounded-full bg-ink/20 border border-paper flex items-center justify-center shrink-0"
                                style={{ marginLeft: '-5px', zIndex: 0 }}
                              >
                                <span className="text-xs text-ink-soft">+{credited.length - 3}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </Popup>
  )
}
