import { useEffect, useState } from 'react'
import { ChevronRight, ChevronLeft, Loader2, Image as ImageIcon, Lock } from 'lucide-react'
import { getDoc, updateDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { auth } from '../../firebase'
import { refs } from '../../lib/db'
import { useAuthStore } from '../../stores/useAuthStore'
import { useUserStore } from '../../stores/useUserStore'
import Toggle from '../../components/ui/Toggle'
import VoiceSecretaryPanel from '../../components/voice/VoiceSecretaryPanel'
import DeleteAccountSheet from '../../components/DeleteAccountSheet'
import { playSound } from '../../lib/sfx'
import { LEGAL_PATHS } from '../../constants/legal'
import WallpaperPicker from '../WallpaperPicker'
import { getWallpaper, wallpaperImage } from '../wallpapers'
import { useOsStore, CUSTOM_WALLPAPER } from '../../stores/useOsStore'
import { useCustomWallpaperUrl } from '../useCustomWallpaperUrl'
import { cropImgStyle } from '../customWallpaper'
import AvatarSheet from '../AvatarSheet'
import ProfileAvatar from '../ProfileAvatar'
import PinPad from '../PinPad'
import { useTouchPrimary } from '../hooks'
import { PIN_LENGTH, hasPasscode, savePasscode, verifyPasscode } from '../passcode'
import { SETTINGS_CATEGORIES } from '../settingsCategories'

const DEFAULT_PRIVACY = {
  mastery: { public: false, followers: true },
  career: { public: false, followers: true },
  university: { public: false, followers: true },
  journey: { public: false, followers: true },
}
const PRIVACY_ITEMS = [
  { key: 'mastery', label: 'Portfolio: Mastery' },
  { key: 'career', label: 'Portfolio: Career' },
  { key: 'university', label: 'Portfolio: University' },
  { key: 'journey', label: 'Journey of Mastery' },
]

const btn = 'px-btn px-4 py-2 thai-font text-sm font-bold bg-paper text-ink inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50'
const btnPrimary = 'px-btn px-4 py-2 thai-font text-sm font-bold bg-brand-strong text-white inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50'
const field = 'w-full px-3 py-2 rounded-ui border-2 border-line-soft bg-paper text-ink text-sm thai-font focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'

function Group({ title, children }) {
  return (
    <section className="px-card p-4 bg-paper flex flex-col gap-3">
      {title && <h4 className="thai-font text-xs font-bold text-ink-soft">{title}</h4>}
      {children}
    </section>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="thai-font text-sm">{label}</span>
      {children}
    </div>
  )
}

function Choice({ options, value, onChange }) {
  return (
    <div className="flex gap-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`flex-1 px-btn py-2 thai-font text-sm font-semibold ${value === v ? 'bg-brand-strong text-white' : 'bg-paper'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function AccountPage({ user }) {
  const uid = user.uid
  const [displayName, setDisplayName] = useState(user.displayName || '')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pickAvatar, setPickAvatar] = useState(false)

  useEffect(() => {
    getDoc(refs.user(uid)).then((snap) => {
      if (!snap.exists()) return
      const d = snap.data()
      setDisplayName(d.displayName || user.displayName || '')
      setBio(d.bio || '')
    }).catch(() => {})
  }, [uid, user.displayName])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      if (auth.currentUser && auth.currentUser.displayName !== displayName) await updateProfile(auth.currentUser, { displayName })
      await updateDoc(refs.user(uid), { displayName, bio })
      setSaved(true)
    } catch (err) {
      console.error('Save profile error:', err)
      alert('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Group>
        <div className="flex items-center gap-3">
          <ProfileAvatar user={user} size={56} />
          <button type="button" onClick={() => setPickAvatar(true)} className={btn}>เปลี่ยนรูปโปรไฟล์</button>
        </div>
        <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
          ชื่อที่แสดง
          <input value={displayName} onChange={(e) => { setDisplayName(e.target.value); setSaved(false) }} placeholder="ชื่อของคุณ" className={field} />
        </label>
        <label className="flex flex-col gap-1 thai-font text-xs text-ink-soft">
          แนะนำตัว ({bio.length}/100)
          <textarea value={bio} onChange={(e) => { setBio(e.target.value.slice(0, 100)); setSaved(false) }} rows={2} placeholder="แนะนำตัวสั้นๆ..." className={`${field} resize-none`} />
        </label>
        <button type="button" onClick={save} disabled={saving} className={btnPrimary}>
          {saving ? <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก...</> : saved ? 'บันทึกแล้ว' : 'บันทึก'}
        </button>
      </Group>
      {pickAvatar && <AvatarSheet user={user} onClose={() => setPickAvatar(false)} />}
    </>
  )
}

// Like a phone's wallpaper settings: a small preview of the Home screen, then the gallery below it.
function WallpaperPreview() {
  const id = useOsStore((s) => s.wallpaperId)
  const hasPhoto = useOsStore((s) => s.customAspect != null)
  const crop = useOsStore((s) => s.customCrop)
  const custom = id === CUSTOM_WALLPAPER && hasPhoto
  const photoUrl = useCustomWallpaperUrl(custom)
  const wp = getWallpaper(custom ? undefined : id)
  return (
    <div
      className="relative mx-auto w-32 aspect-[9/16] rounded-[18px] border-4 border-brand-strong overflow-hidden shadow-px-sm"
      style={{ background: custom ? undefined : `url(${wallpaperImage(wp.id, 'portrait')}) center bottom / cover, ${wp.css}`, imageRendering: 'pixelated' }}
      role="img"
      aria-label={`วอลเปเปอร์ปัจจุบัน: ${custom ? 'รูปของฉัน' : wp.name}`}
    >
      {custom && photoUrl && <img src={photoUrl} alt="" draggable={false} className="w-full h-full" style={cropImgStyle(crop)} />}
      <div className="absolute inset-x-2 top-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => <span key={i} className={`aspect-square rounded-md ${wp.dark && !custom ? 'bg-white/40' : 'bg-white/70'}`} />)}
      </div>
    </div>
  )
}

function DisplayPage({ user }) {
  const [avatar, setAvatar] = useState(false)
  return (
    <>
      <Group title="วอลเปเปอร์">
        <WallpaperPreview />
        <WallpaperPicker maxHeight="45vh" />
        <p className="thai-font text-xs text-ink-soft">ลองกดค้างที่พื้นหลังหน้า Home ก็เปิดตัวเลือกวอลเปเปอร์ได้เหมือนกัน</p>
      </Group>
      <Group>
        <button type="button" onClick={() => setAvatar(true)} className={btn}><ImageIcon size={16} /> เปลี่ยนรูปโปรไฟล์บนหน้า Home</button>
      </Group>
      {avatar && <AvatarSheet user={user} onClose={() => setAvatar(false)} />}
    </>
  )
}

function SoundPage() {
  const sfxEnabled = useUserStore((s) => s.sfxEnabled)
  const setSfxEnabled = useUserStore((s) => s.setSfxEnabled)
  const sfxVolume = useUserStore((s) => s.sfxVolume)
  const setSfxVolume = useUserStore((s) => s.setSfxVolume)
  const controlMode = useUserStore((s) => s.controlMode)
  const setControlMode = useUserStore((s) => s.setControlMode)
  return (
    <>
      <Group title="เสียง">
        <Row label="เสียงเอฟเฟกต์"><Toggle checked={sfxEnabled !== false} onChange={setSfxEnabled} label="เสียงเอฟเฟกต์" /></Row>
        {sfxEnabled !== false && (
          <label className="flex items-center gap-3 thai-font text-sm">
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
      </Group>
      <Group title="การเดินในเกม">
        <Choice value={controlMode} onChange={setControlMode} options={[['joystick', 'Joystick'], ['clickToMove', 'แตะเพื่อเดิน']]} />
      </Group>
    </>
  )
}

function AiPage() {
  const aiLanguage = useUserStore((s) => s.aiLanguage)
  const setAiLanguage = useUserStore((s) => s.setAiLanguage)
  return (
    <>
      <Group title="ภาษาที่ AI ตอบ">
        <Choice value={aiLanguage} onChange={setAiLanguage} options={[['Thai', 'ภาษาไทย'], ['English', 'English']]} />
      </Group>
      <Group title="เลขา AI พี่ใจดี">
        <VoiceSecretaryPanel />
      </Group>
    </>
  )
}

// Change the device passcode: current PIN → new PIN → confirm. Per device, like the lock screen.
function SecurityPage({ user }) {
  const touch = useTouchPrimary()
  const [has, setHas] = useState(() => hasPasscode(user.uid))
  const [step, setStep] = useState('idle')   // idle | current | new | confirm
  const [first, setFirst] = useState(null)
  const [message, setMessage] = useState('')
  const [shake, setShake] = useState(0)

  const prompt = { current: 'ใส่รหัสผ่านปัจจุบัน', new: 'ใส่รหัสผ่านใหม่', confirm: 'ยืนยันรหัสผ่านใหม่อีกครั้ง' }[step]

  function start() { setMessage(''); setFirst(null); setStep(has ? 'current' : 'new') }

  async function onPin(pin) {
    setMessage('')
    if (step === 'current') {
      if (await verifyPasscode(user.uid, pin)) setStep('new')
      else { setMessage('รหัสผ่านไม่ถูกต้อง'); setShake((n) => n + 1) }
    } else if (step === 'new') {
      setFirst(pin)
      setStep('confirm')
    } else if (step === 'confirm') {
      if (pin !== first) { setMessage('รหัสผ่านสองครั้งไม่ตรงกัน ลองใหม่'); setShake((n) => n + 1); setFirst(null); setStep('new'); return }
      await savePasscode(user.uid, pin)
      setHas(true)
      setStep('idle')
      setMessage('เปลี่ยนรหัสผ่านแล้ว')
    }
  }

  return (
    <Group title="รหัสผ่านของเครื่องนี้">
      <p className="thai-font text-xs text-ink-soft">รหัส {PIN_LENGTH} หลัก เก็บไว้ในเครื่องนี้เท่านั้น ไม่ถูกส่งไปที่ไหน ถ้าลืมให้ออกจากระบบแล้วเข้าสู่ระบบด้วย Google ใหม่</p>
      {step === 'idle' ? (
        <button type="button" onClick={start} className={btn}><Lock size={16} /> {has ? 'เปลี่ยนรหัสผ่าน' : 'ตั้งรหัสผ่าน'}</button>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="thai-font text-sm font-semibold">{prompt}</p>
          <PinPad key={step} onComplete={onPin} shakeKey={shake} showKeypad={touch} />
          <button type="button" onClick={() => { setStep('idle'); setMessage('') }} className="thai-font text-xs text-ink-soft underline">ยกเลิก</button>
        </div>
      )}
      {message && <p role="status" className="thai-font text-sm text-brand-strong">{message}</p>}
    </Group>
  )
}

function PrivacyPage({ user }) {
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY)
  useEffect(() => {
    getDoc(refs.user(user.uid)).then((snap) => {
      if (snap.exists() && snap.data().privacy) setPrivacy({ ...DEFAULT_PRIVACY, ...snap.data().privacy })
    }).catch(() => {})
  }, [user.uid])

  async function update(item, type, value) {
    setPrivacy((p) => ({ ...p, [item]: { ...p[item], [type]: value } }))
    try { await updateDoc(refs.user(user.uid), { [`privacy.${item}.${type}`]: value }) } catch (err) { console.error('Privacy update error:', err) }
  }

  return (
    <>
      {PRIVACY_ITEMS.map(({ key, label }) => (
        <Group key={key} title={label}>
          <Row label="คนที่ไม่ได้ follow เห็นได้">
            <Toggle checked={privacy[key]?.public ?? false} onChange={(v) => update(key, 'public', v)} label={`${label}: คนที่ไม่ได้ follow เห็นได้`} />
          </Row>
          <Row label="คนที่ follow เห็นได้">
            <Toggle checked={privacy[key]?.followers ?? true} onChange={(v) => update(key, 'followers', v)} label={`${label}: คนที่ follow เห็นได้`} />
          </Row>
        </Group>
      ))}
    </>
  )
}

function AboutPage() {
  const signOut = useAuthStore((s) => s.signOut)
  const resetUser = useUserStore((s) => s.resetUser)
  const [deleteOpen, setDeleteOpen] = useState(false)
  async function out() {
    resetUser()
    await signOut()
  }
  return (
    <>
      <Group title="นโยบาย">
        <div className="flex gap-4 thai-font text-sm">
          <a href={LEGAL_PATHS.privacy} target="_blank" rel="noopener noreferrer" className="underline text-brand-strong">นโยบายความเป็นส่วนตัว</a>
          <a href={LEGAL_PATHS.terms} target="_blank" rel="noopener noreferrer" className="underline text-brand-strong">ข้อกำหนดการใช้งาน</a>
        </div>
      </Group>
      <Group title="บัญชี">
        <button type="button" onClick={out} className={`${btn} text-danger border-danger`}>ออกจากระบบ</button>
      </Group>
      <Group title="โซนอันตราย">
        <p className="thai-font text-xs text-ink-soft">ลบบัญชีแล้วกู้คืนไม่ได้ ระบบจะบอกว่าอะไรถูกลบและอะไรเก็บไว้ก่อนยืนยัน</p>
        <button type="button" onClick={() => setDeleteOpen(true)} className={`${btn} text-danger border-danger`}>ลบบัญชี</button>
      </Group>
      {deleteOpen && <DeleteAccountSheet onClose={() => setDeleteOpen(false)} />}
    </>
  )
}

const PAGES = {
  account: AccountPage, display: DisplayPage, sound: SoundPage, ai: AiPage,
  security: SecurityPage, privacy: PrivacyPage, about: AboutPage,
}

// Settings: a list of categories; each opens its own page. Same list on every screen size.
export default function SettingsApp() {
  const user = useAuthStore((s) => s.user)
  const [openId, setOpenId] = useState(null)
  const cat = SETTINGS_CATEGORIES.find((c) => c.id === openId)
  const Page = cat ? PAGES[cat.id] : null

  if (!user) return <p className="thai-font text-sm text-ink-soft p-6">กรุณาเข้าสู่ระบบก่อน</p>

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto flex flex-col gap-4">
      {cat ? (
        <>
          <button type="button" onClick={() => setOpenId(null)} className="self-start thai-font text-sm font-semibold text-brand-strong inline-flex items-center gap-1">
            <ChevronLeft size={16} aria-hidden="true" /> การตั้งค่า
          </button>
          <h3 className="thai-font font-bold text-lg">{cat.label}</h3>
          <Page user={user} />
        </>
      ) : (
        <ul className="flex flex-col gap-2">
          {SETTINGS_CATEGORIES.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setOpenId(c.id)} className="px-card w-full p-3 bg-paper flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <span className="min-w-0 flex-1">
                  <span className="thai-font text-sm font-bold block">{c.label}</span>
                  <span className="thai-font text-xs text-ink-soft block">{c.hint}</span>
                </span>
                <ChevronRight size={18} className="text-ink-soft shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
