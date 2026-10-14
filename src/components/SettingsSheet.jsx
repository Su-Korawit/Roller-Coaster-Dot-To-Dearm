import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Camera } from 'lucide-react'
import { getDoc, updateDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { auth } from '../firebase'
import { refs } from '../lib/db'
import { compressImage } from '../utils/compressImage'
import { useAuthStore } from '../stores/useAuthStore'
import { useUserStore } from '../stores/useUserStore'
import { useSelectStore } from '../stores/useSelectStore'
import { usePlansStore } from '../stores/usePlansStore'
import { useOnboardingUiStore } from '../stores/useOnboardingUiStore'
import { useNavigate } from 'react-router-dom'
import Toggle from './ui/Toggle'
import SegmentedTabs from './ui/SegmentedTabs'
import Popup from './ui/Popup'
import DeleteAccountSheet from './DeleteAccountSheet'
import { playSound } from '../lib/sfx'
import { LEGAL_PATHS } from '../constants/legal'

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

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'interface', label: 'Interface' },
  { id: 'general', label: 'General' },
]

const UI_VISIBILITY_ITEMS = [
  { key: 'hotbar',     label: 'แถบไอเทมด่วน (Hotbar)' },
  { key: 'shortcuts',  label: 'ปุ่มลัด ปฏิทิน/Roadmap' },
  { key: 'newsButton', label: 'ปุ่มข่าวสาร' },
  { key: 'musicPill',  label: 'แถบเพลงด้านบน' },
  { key: 'contactFab', label: 'ปุ่มติดต่อผู้พัฒนา' },
]

export default function SettingsSheet({ onClose, onProfileUpdated }) {
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const authUser = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const aiLanguage = useUserStore((s) => s.aiLanguage)
  const setAiLanguage = useUserStore((s) => s.setAiLanguage)
  const controlMode = useUserStore((s) => s.controlMode)
  const setControlMode = useUserStore((s) => s.setControlMode)
  const sfxEnabled = useUserStore((s) => s.sfxEnabled)
  const setSfxEnabled = useUserStore((s) => s.setSfxEnabled)
  const sfxVolume = useUserStore((s) => s.sfxVolume)
  const setSfxVolume = useUserStore((s) => s.setSfxVolume)
  const resetUser = useUserStore((s) => s.resetUser)
  const setProfilePhotoURL = useUserStore((s) => s.setProfilePhotoURL)
  const uiVisibility = useUserStore((s) => s.uiVisibility)
  const setUiVisibility = useUserStore((s) => s.setUiVisibility)
  const resetSelection = useSelectStore((s) => s.resetSelection)
  const resetPlans = usePlansStore((s) => s.resetPlans)
  const openOnboarding = useOnboardingUiStore((s) => s.open)

  const uid = authUser?.uid
  const fileInputRef = useRef(null)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [newPhotoFile, setNewPhotoFile] = useState(null)
  const [newPhotoPreview, setNewPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY)
  const [activeTab, setActiveTab] = useState('profile')

  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!uid) return
    getDoc(refs.user(uid)).then((snap) => {
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

      await updateDoc(refs.user(uid), { displayName, bio, photoURL: finalPhotoURL })
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
      await updateDoc(refs.user(uid), { [`privacy.${item}.${type}`]: value })
    } catch (err) {
      console.error('Privacy update error:', err)
    }
  }

  async function handleSignOut() {
    resetUser()
    resetSelection()
    resetPlans()
    await signOut()
    navigate('/')
    onClose()
  }

  function handleResetOnboarding() {
    openOnboarding()
    onClose()
  }

  const currentPhoto = newPhotoPreview || photoURL || authUser?.photoURL
  const initials = (displayName || authUser?.displayName || '?').charAt(0).toUpperCase()

  return (
    <>
    <Popup variant="sheet" size="md" onClose={onClose}>
      <div
        className="flex flex-col h-full transition-transform duration-300 ease-out"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <p className="pixel-font text-[11px] text-ink">Settings</p>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="neo-btn w-9 h-9 flex items-center justify-center rounded-lg bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <SegmentedTabs tabs={SETTINGS_TABS} activeId={activeTab} onChange={setActiveTab} />

        <div className="overflow-y-auto flex-1 px-5 pt-5 pb-10 space-y-5">

          {activeTab === 'profile' && (
          <section className="space-y-3">
            <p className="pixel-font text-[9px] text-brand-strong uppercase tracking-wide">Edit Profile</p>

            {/* Avatar picker */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-brand-soft flex items-center justify-center border-2 border-brand/30">
                  {currentPhoto
                    ? <img src={currentPhoto} alt="" className="w-full h-full object-cover" />
                    : <span className="text-2xl font-bold text-brand-strong">{initials}</span>}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand rounded-full flex items-center justify-center shadow"
                >
                  <Camera size={11} className="text-white" />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-brand font-semibold hover:underline text-left"
                >
                  อัปโหลดรูปใหม่
                </button>
                {authUser?.photoURL && photoURL !== authUser.photoURL && (
                  <button
                    onClick={() => { setNewPhotoFile(null); setNewPhotoPreview(null); setPhotoURL(authUser.photoURL) }}
                    className="text-xs text-ink-soft hover:text-ink text-left"
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
              <label className="thai-font text-xs text-ink-soft block mb-1">ชื่อที่แสดง</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ชื่อของคุณ"
                className="w-full rounded-xl border border-brand/30 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="pixel-font text-[8px] text-ink-soft block mb-1">
                Bio <span className="text-ink-soft/50">({bio.length}/100)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 100))}
                rows={2}
                placeholder="แนะนำตัวสั้นๆ..."
                className="w-full rounded-xl border border-brand/30 px-3 py-2 text-sm outline-none focus:border-brand resize-none"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full bg-brand text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> บันทึก...</> : 'บันทึก'}
            </button>
          </section>
          )}

          {activeTab === 'privacy' && (
          <section className="space-y-4">
            <p className="thai-font text-xs text-brand font-semibold uppercase tracking-wide">ใครมองเห็นอะไรได้บ้าง</p>

            {PRIVACY_ITEMS.map(({ key, label }) => (
              <div key={key}>
                <p className="text-xs font-semibold text-ink mb-2">{label}</p>
                <div className="space-y-2 pl-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-soft">คนที่ไม่ได้ follow เห็นได้</span>
                    <Toggle
                      checked={privacy[key]?.public ?? false}
                      onChange={(v) => updatePrivacy(key, 'public', v)}
                      label="คนที่ไม่ได้ follow เห็นได้"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-soft">คนที่ follow เห็นได้</span>
                    <Toggle
                      checked={privacy[key]?.followers ?? true}
                      onChange={(v) => updatePrivacy(key, 'followers', v)}
                      label="คนที่ follow เห็นได้"
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>
          )}

          {activeTab === 'general' && (
          <section className="space-y-3">
            <p className="pixel-font text-[9px] text-brand-strong uppercase tracking-wide">General</p>

            <div>
              <p className="pixel-font text-[8px] text-ink-soft mb-1.5">AI Output Language</p>
              <div className="flex gap-2">
                {['Thai', 'English'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setAiLanguage(lang)}
                    className={`flex-1 rounded-xl py-2 text-sm border transition-colors ${
                      aiLanguage === lang
                        ? 'bg-brand border-brand text-white font-semibold'
                        : 'bg-white border-brand/30 text-brand-strong'
                    }`}
                  >
                    {lang === 'Thai' ? 'ภาษาไทย' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="pixel-font text-[8px] text-ink-soft mb-1.5">Movement Control</p>
              <div className="flex gap-2">
                {[
                  { value: 'joystick',    label: 'Joystick' },
                  { value: 'clickToMove', label: 'แตะเพื่อเดิน' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setControlMode(value)}
                    className={`flex-1 rounded-xl py-2 text-sm border transition-colors ${
                      controlMode === value
                        ? 'bg-brand border-brand text-white font-semibold'
                        : 'bg-white border-brand/30 text-brand-strong'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="pixel-font text-[8px] text-ink-soft">Sound Effects</p>
                <Toggle checked={sfxEnabled !== false} onChange={setSfxEnabled} label="เสียงเอฟเฟกต์" />
              </div>
              {sfxEnabled !== false && (
                <label className="flex items-center gap-3 text-xs text-ink">
                  <span className="shrink-0">ระดับเสียง</span>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={Math.round((sfxVolume ?? 0.5) * 100)}
                    onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                    onPointerUp={() => playSound('coin')}
                    aria-label="ระดับเสียงเอฟเฟกต์"
                    className="flex-1 accent-brand"
                  />
                </label>
              )}
            </div>

            <button
              onClick={handleResetOnboarding}
              className="w-full rounded-xl border border-ink/20 text-ink-soft py-2 text-sm hover:bg-brand-soft/60 transition-colors"
            >
              Reset Onboarding
            </button>

            <button
              onClick={handleSignOut}
              className="w-full rounded-xl border border-danger/30 text-danger py-2 text-sm hover:bg-danger/10 transition-colors"
            >
              Sign Out
            </button>

            <div className="pt-3 mt-1 border-t border-ink/10 space-y-2">
              <p className="pixel-font text-[8px] text-ink-soft">ความเป็นส่วนตัว</p>
              <div className="flex gap-3 text-xs">
                <a href={LEGAL_PATHS.privacy} target="_blank" rel="noopener noreferrer" className="underline text-brand-strong">นโยบายความเป็นส่วนตัว</a>
                <a href={LEGAL_PATHS.terms} target="_blank" rel="noopener noreferrer" className="underline text-brand-strong">ข้อกำหนดการใช้งาน</a>
              </div>
              <button
                onClick={() => setDeleteOpen(true)}
                className="w-full rounded-xl border border-danger text-danger py-2 text-sm font-semibold hover:bg-danger/10 transition-colors"
              >
                ลบบัญชี
              </button>
            </div>
          </section>
          )}

          {activeTab === 'interface' && (
          <section className="space-y-4">
            <p className="pixel-font text-[9px] text-brand-strong uppercase tracking-wide">Interface</p>

            {UI_VISIBILITY_ITEMS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">{label}</span>
                <Toggle
                  checked={uiVisibility?.[key] ?? true}
                  onChange={(v) => setUiVisibility(key, v)}
                  label={label}
                />
              </div>
            ))}
          </section>
          )}

        </div>
      </div>
    </Popup>
      {deleteOpen && <DeleteAccountSheet onClose={() => setDeleteOpen(false)} />}
    </>
  )
}
