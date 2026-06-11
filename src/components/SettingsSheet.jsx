import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Camera } from 'lucide-react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { db, auth } from '../firebase'
import { compressImage } from '../utils/compressImage'
import { useAuthStore } from '../stores/useAuthStore'
import { useUserStore } from '../stores/useUserStore'
import { useSelectStore } from '../stores/useSelectStore'
import { useNavigate } from 'react-router-dom'

const DEFAULT_PRIVACY = {
  mastery:    { public: false, followers: true },
  career:     { public: false, followers: true },
  university: { public: false, followers: true },
  journey:    { public: false, followers: true },
}

const PRIVACY_ITEMS = [
  { key: 'mastery',    label: 'Portfolio: Mastery' },
  { key: 'career',     label: 'Portfolio: Career' },
  { key: 'university', label: 'Portfolio: University' },
  { key: 'journey',    label: 'Journey of Mastery' },
]


function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        value ? 'bg-[#a78bda]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          value ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export default function SettingsSheet({ onClose, onProfileUpdated }) {
  const navigate = useNavigate()
  const authUser = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const { aiLanguage, setAiLanguage, resetUser, setProfilePhotoURL } = useUserStore()
  const { resetSelection } = useSelectStore()

  const uid = authUser?.uid
  const fileInputRef = useRef(null)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [newPhotoFile, setNewPhotoFile] = useState(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY)

  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!uid) return
    getDoc(doc(db, 'users', uid)).then((snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      setDisplayName(data.displayName || authUser?.displayName || '')
      setBio(data.bio || '')
      setPhotoURL(data.photoURL || authUser?.photoURL || '')
      if (data.privacy) {
        setPrivacy({ ...DEFAULT_PRIVACY, ...data.privacy })
      }
    })
  }, [uid])

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewPhotoFile(file)
    setNewPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSaveProfile() {
    if (!uid) return
    setSaving(true)
    try {
      let finalPhotoURL = photoURL

      if (newPhotoFile) {
        finalPhotoURL = await compressImage(newPhotoFile)
      }
      // Auth profile only stores displayName — base64 data URLs are too long
      // for the Auth photoURL field, and the app reads photoURL from Firestore.
      if (auth.currentUser && auth.currentUser.displayName !== displayName) {
        await updateProfile(auth.currentUser, { displayName })
      }

      await updateDoc(doc(db, 'users', uid), { displayName, bio, photoURL: finalPhotoURL })
      setPhotoURL(finalPhotoURL)
      setNewPhotoFile(null)
      setNewPhotoPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setProfilePhotoURL(finalPhotoURL)
      onProfileUpdated?.()
    } catch (err) {
      console.error('Save profile error:', err)
      alert('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  async function updatePrivacy(item, type, value) {
    if (!uid) return
    setPrivacy((prev) => ({ ...prev, [item]: { ...prev[item], [type]: value } }))
    try {
      await updateDoc(doc(db, 'users', uid), { [`privacy.${item}.${type}`]: value })
    } catch (err) {
      console.error('Privacy update error:', err)
    }
  }

  async function handleSignOut() {
    resetUser()
    resetSelection()
    await signOut()
    navigate('/')
    onClose()
  }

  function handleResetOnboarding() {
    navigate('/select/mbti')
    onClose()
  }

  const currentPhoto = newPhotoPreview || photoURL || authUser?.photoURL
  const initials = (displayName || authUser?.displayName || '?').charAt(0).toUpperCase()

  return (
    <div className="absolute inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className="relative bg-white rounded-t-[32px] shadow-2xl flex flex-col transition-transform duration-300 ease-out md:max-w-lg md:mx-auto md:w-full"
        style={{
          maxHeight: '92%',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <p className="pixel-font text-[11px] text-gray-700">Settings</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-10 space-y-5">

          {/* ── [1] Edit Profile ── */}
          <section className="space-y-3">
            <p className="pixel-font text-[9px] text-purple-500 uppercase tracking-wide">Edit Profile</p>

            {/* Avatar picker */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center border-2 border-purple-200">
                  {currentPhoto
                    ? <img src={currentPhoto} alt="" className="w-full h-full object-cover" />
                    : <span className="text-2xl font-bold text-purple-400">{initials}</span>}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#a78bda] rounded-full flex items-center justify-center shadow"
                >
                  <Camera size={11} className="text-white" />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[#a78bda] font-semibold hover:underline text-left"
                >
                  อัปโหลดรูปใหม่
                </button>
                {authUser?.photoURL && photoURL !== authUser.photoURL && (
                  <button
                    onClick={() => { setNewPhotoFile(null); setNewPhotoPreview(null); setPhotoURL(authUser.photoURL) }}
                    className="text-xs text-gray-400 hover:text-gray-600 text-left"
                  >
                    ใช้ Google Photo
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Display name */}
            <div>
              <label className="pixel-font text-[8px] text-gray-400 block mb-1">ชื่อที่แสดง</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ชื่อของคุณ"
                className="w-full rounded-xl border border-purple-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="pixel-font text-[8px] text-gray-400 block mb-1">
                Bio <span className="text-gray-300">({bio.length}/100)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 100))}
                rows={2}
                placeholder="แนะนำตัวสั้นๆ..."
                className="w-full rounded-xl border border-purple-200 px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full bg-[#a78bda] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> บันทึก...</> : 'บันทึก'}
            </button>
          </section>

          <div className="h-px bg-gray-100" />

          {/* ── [2] Privacy Settings ── */}
          <section className="space-y-4">
            <p className="pixel-font text-[9px] text-purple-500 uppercase tracking-wide">ใครมองเห็นอะไรได้บ้าง</p>

            {PRIVACY_ITEMS.map(({ key, label }) => (
              <div key={key}>
                <p className="text-xs font-semibold text-gray-700 mb-2">{label}</p>
                <div className="space-y-2 pl-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">คนที่ไม่ได้ follow เห็นได้</span>
                    <Toggle
                      value={privacy[key]?.public ?? false}
                      onChange={(v) => updatePrivacy(key, 'public', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">คนที่ follow เห็นได้</span>
                    <Toggle
                      value={privacy[key]?.followers ?? true}
                      onChange={(v) => updatePrivacy(key, 'followers', v)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <div className="h-px bg-gray-100" />

          {/* ── [3] General Settings ── */}
          <section className="space-y-3">
            <p className="pixel-font text-[9px] text-purple-500 uppercase tracking-wide">General</p>

            <div>
              <p className="pixel-font text-[8px] text-gray-400 mb-1.5">AI Output Language</p>
              <div className="flex gap-2">
                {['Thai', 'English'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setAiLanguage(lang)}
                    className={`flex-1 rounded-xl py-2 text-sm border transition-colors ${
                      aiLanguage === lang
                        ? 'bg-[#a78bda] border-[#a78bda] text-white font-semibold'
                        : 'bg-white border-purple-200 text-purple-500'
                    }`}
                  >
                    {lang === 'Thai' ? 'ภาษาไทย' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleResetOnboarding}
              className="w-full rounded-xl border border-gray-200 text-gray-600 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              Reset Onboarding
            </button>

            <button
              onClick={handleSignOut}
              className="w-full rounded-xl border border-red-200 text-red-500 py-2 text-sm hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          </section>

        </div>
      </div>
    </div>
  )
}
