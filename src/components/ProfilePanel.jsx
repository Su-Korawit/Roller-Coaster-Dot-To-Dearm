import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Share2, Pencil } from 'lucide-react'
import { getDoc } from 'firebase/firestore'
import { useAuthStore } from '../stores/useAuthStore'
import { useSelectStore } from '../stores/useSelectStore'
import { refs } from '../lib/db'
import SettingsSheet from './SettingsSheet'
import JourneyManager from './profile/JourneyManager'

// Profile shell: header (avatar / name / bio / settings / share) around the
// JourneyManager body. The portfolio circles + journey list live in
// JourneyManager because they share `activeCategory` (circles select the list).
export default function ProfilePanel({ onClose }) {
  const navigate = useNavigate()
  const authUser = useAuthStore((s) => s.user)
  const mbti = useSelectStore((s) => s.mbti)

  // Firestore profile (displayName, bio, photoURL)
  const [firestoreProfile, setFirestoreProfile] = useState(null)
  const [showSettingsSheet, setShowSettingsSheet] = useState(false)

  function fetchFirestoreProfile() {
    if (!authUser?.uid) return
    getDoc(refs.user(authUser.uid)).then((snap) => {
      if (snap.exists()) setFirestoreProfile(snap.data())
    })
  }

  useEffect(() => {
    fetchFirestoreProfile()
  }, [authUser?.uid])

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
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Top-right icons */}
      <div className="flex justify-end items-center gap-2 px-5 pt-1">
        <button
          onClick={() => setShowSettingsSheet(true)}
          className="text-gray-400 hover:text-gray-600"
        >
          <Settings size={19} />
        </button>
        <button
          onClick={() => alert('Share link copied!')}
          className="text-gray-400 hover:text-gray-600"
        >
          <Share2 size={19} />
        </button>
        <button
          onClick={onClose}
          aria-label="ปิด"
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ml-1"
        >
          <span aria-hidden="true" className="text-base leading-none">✕</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        {/* Avatar + Name + Bio */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center shadow-md border-4 border-white">
              {photoURL
                ? <img src={photoURL} alt="" className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold text-purple-400">{initials}</span>}
            </div>
            <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          </div>
          <p className="pixel-font text-[13px] text-gray-800">{displayName}</p>
          <p className="text-xs text-gray-400 text-center leading-snug max-w-50">
            {bio || `MBTI: ${mbti || '-'}`}
          </p>
        </div>

        {/* Portfolio circles + Journey list + their modals */}
        <JourneyManager />

        {/* Edit path */}
        <button
          onClick={() => navigate('/select/mbti')}
          className="w-full rounded-2xl border-2 border-dashed border-purple-200 py-3 text-sm text-purple-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
        >
          <Pencil size={12} strokeWidth={2} className="inline mr-1" />
          Edit your path
        </button>
      </div>

      {/* Settings Sheet */}
      {showSettingsSheet && (
        <SettingsSheet
          onClose={() => setShowSettingsSheet(false)}
          onProfileUpdated={fetchFirestoreProfile}
        />
      )}
    </div>
  )
}
