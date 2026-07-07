import { useState, useEffect, lazy, Suspense } from 'react'
import { Settings, Share2, Pencil, X } from 'lucide-react'
import { getDoc } from 'firebase/firestore'
import { useAuthStore } from '../stores/useAuthStore'
import { useSelectStore } from '../stores/useSelectStore'
import { useOnboardingUiStore } from '../stores/useOnboardingUiStore'
import { usePopupStore } from '../stores/usePopupStore'
import { refs } from '../lib/db'
import SettingsSheet from './SettingsSheet'
import JourneyManager from './profile/JourneyManager'

const RoadmapPreview = lazy(() => import('./profile/RoadmapPreview'))

// Profile shell: header (avatar / name / bio / settings / share) around the
// JourneyManager body. The portfolio circles + journey list live in
// JourneyManager because they share `activeCategory` (circles select the list).
export default function ProfilePanel({ onClose, onOpenRoadmap }) {
  const authUser = useAuthStore((s) => s.user)
  const mbti = useSelectStore((s) => s.mbti)
  const openOnboarding = useOnboardingUiStore((s) => s.open)
  const activePopup = usePopupStore((s) => s.activePopup)
  const openPopup = usePopupStore((s) => s.open)
  const closePopup = usePopupStore((s) => s.close)

  // Firestore profile (displayName, bio, photoURL)
  const [firestoreProfile, setFirestoreProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(Boolean(authUser?.uid))

  function fetchFirestoreProfile() {
    if (!authUser?.uid) return
    setProfileLoading(true)
    getDoc(refs.user(authUser.uid))
      .then((snap) => {
        if (snap.exists()) setFirestoreProfile(snap.data())
      })
      .finally(() => setProfileLoading(false))
  }

  useEffect(() => {
    if (!authUser?.uid) {
      setProfileLoading(false)
      return
    }
    fetchFirestoreProfile()
  }, [authUser?.uid])

  const showProfileSkeleton = profileLoading && !firestoreProfile
  const displayName = firestoreProfile?.displayName || authUser?.displayName || 'Player'
  const photoURL = firestoreProfile?.photoURL || authUser?.photoURL
  const bio = firestoreProfile?.bio
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-white/96 backdrop-blur-sm rounded-t-4xl overflow-hidden md:max-w-2xl md:mx-auto lg:max-w-3xl"
      style={{ top: '6%' }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-ink rounded-full" />
      </div>

      {/* Top-right icons */}
      <div className="flex justify-end items-center gap-2 px-5 pt-1">
        <button
          onClick={() => openPopup('settings')}
          className="text-ink-soft hover:text-ink"
        >
          <Settings size={19} strokeWidth={2.5} />
        </button>
        <button
          onClick={() => alert('Share link copied!')}
          className="text-ink-soft hover:text-ink"
        >
          <Share2 size={19} strokeWidth={2.5} />
        </button>
        <button
          onClick={onClose}
          aria-label="ปิด"
          className="neo-btn w-9 h-9 flex items-center justify-center rounded-lg bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ml-1"
        >
          <X size={16} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        {/* Avatar + Name + Bio */}
        {showProfileSkeleton ? (
          <div
            className="flex flex-col items-center gap-2 pt-2 animate-pulse"
            data-testid="profile-header-skeleton"
          >
            <div className="w-20 h-20 rounded-full bg-brand-soft/60" />
            <div className="h-4 bg-brand-soft/60 rounded w-24" />
            <div className="h-3 bg-brand-soft/40 rounded w-32" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-brand-soft flex items-center justify-center shadow-hard-sm border-4 border-surface">
                {photoURL
                  ? <img src={photoURL} alt="" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-bold text-brand-strong">{initials}</span>}
              </div>
              <div className="absolute bottom-1 right-1 w-3 h-3 bg-good rounded-full border-2 border-surface" />
            </div>
            <p className="pixel-font text-[13px] text-ink">{displayName}</p>
            <p className="text-xs text-ink-soft text-center leading-snug max-w-50">
              {bio || `MBTI: ${mbti || '-'}`}
            </p>
          </div>
        )}

        {/* Portfolio circles + Journey list + their modals */}
        <JourneyManager />

        {/* Roadmap preview — live embed of the same useRoadmapStore canvas the
            Roadmap FAB opens, so Profile and Roadmap are one tap apart */}
        <div>
          <p className="pixel-font text-[10px] text-ink-soft mb-2">Your Roadmap</p>
          <Suspense fallback={<div className="w-full h-40 rounded-2xl bg-brand-soft/40 animate-pulse" />}>
            <RoadmapPreview onOpen={onOpenRoadmap} />
          </Suspense>
        </div>

        {/* Edit path */}
        <button
          onClick={openOnboarding}
          className="w-full rounded-2xl border-2 border-dashed border-brand/30 py-3 text-sm text-brand-strong hover:border-brand hover:text-brand-strong transition-colors"
        >
          <Pencil size={12} strokeWidth={2} className="inline mr-1" />
          Edit your path
        </button>
      </div>

      {/* Settings Sheet */}
      {activePopup === 'settings' && (
        <SettingsSheet
          onClose={closePopup}
          onProfileUpdated={fetchFirestoreProfile}
        />
      )}
    </div>
  )
}
