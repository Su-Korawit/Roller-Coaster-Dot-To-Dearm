import { useState } from 'react'
import { useAuthStore } from '../stores/useAuthStore'
import Wallpaper from './Wallpaper'
import { useWallpaperDark } from './useWallpaperDark'
import PinPad from './PinPad'
import { useClock, useDevice, useTouchPrimary, formatTime, formatDate } from './hooks'
import { PIN_LENGTH, savePasscode, verifyPasscode, clearPasscode } from './passcode'

// mode 'set'    → first time on this device: choose a PIN, then confirm it
// mode 'unlock' → lock screen: enter the PIN
export default function PasscodeScreen({ user, mode, onDone }) {
  const signOut = useAuthStore((s) => s.signOut)
  const now = useClock()
  const dark = useWallpaperDark()
  const { device } = useDevice()
  const touch = useTouchPrimary()
  // Phones and iPads (also iPad landscape): number pad, no avatar/name. Desktop/Mac: type on the keyboard.
  const compact = device !== 'desktop' || touch
  const [first, setFirst] = useState(null)   // 'set' mode: the PIN typed in step 1
  const [message, setMessage] = useState('')
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)

  const title = mode === 'unlock' ? 'ใส่รหัสผ่านเพื่อปลดล็อก' : first ? 'ยืนยันรหัสผ่านอีกครั้ง' : 'ตั้งรหัสผ่านสำหรับเครื่องนี้'
  const name = user.displayName || user.email || 'ผู้ใช้'

  async function handlePin(pin) {
    if (busy) return
    setMessage('')
    if (mode === 'unlock') {
      setBusy(true)
      const ok = await verifyPasscode(user.uid, pin)
      setBusy(false)
      if (ok) onDone()
      else { setMessage('รหัสผ่านไม่ถูกต้อง'); setShake((n) => n + 1) }
      return
    }
    if (!first) { setFirst(pin); return }
    if (pin !== first) {
      setFirst(null)
      setMessage('รหัสผ่านไม่ตรงกัน ลองตั้งใหม่อีกครั้ง')
      setShake((n) => n + 1)
      return
    }
    setBusy(true)
    try {
      await savePasscode(user.uid, pin)
      onDone()
    } catch (e) {
      console.error('[os] saving passcode failed:', e)
      setMessage('บันทึกรหัสผ่านไม่สำเร็จ ลองอีกครั้ง')
      setFirst(null)
    } finally {
      setBusy(false)
    }
  }

  async function forgot() {
    // Signing in with Google again is the proof of ownership; the old passcode is wiped first.
    clearPasscode(user.uid)
    await signOut()
  }

  const linkBase = 'thai-font text-sm px-4 py-1.5 rounded-full underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
  const linkTone = dark ? 'bg-ink/45 text-white' : 'bg-paper/75 text-ink'
  const panelTone = dark ? 'bg-ink/25' : 'bg-paper/40'

  return (
    <Wallpaper scroll className="flex flex-col items-center px-6">
      {/* Big clock at the top */}
      <div className="relative z-10 mt-[6vh] text-center os-no-select shrink-0">
        <p className="font-display text-7xl sm:text-8xl lg:text-9xl font-bold tracking-tight leading-none">{formatTime(now)}</p>
        <p className="thai-font mt-2 text-lg sm:text-xl opacity-85">{formatDate(now)}</p>
      </div>

      {/* Profile + passcode in the middle of the screen, forgot-link right under them */}
      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center py-6">
        <div className={`flex flex-col items-center gap-1 rounded-sheet backdrop-blur-sm px-8 py-6 ${panelTone}`}>
          <div className="flex flex-col items-center gap-1 text-center">
            {!compact && (
              <>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-20 h-20 rounded-full border-2 border-line" />
                ) : (
                  <span className="w-20 h-20 rounded-full border-2 border-line bg-paper text-ink font-display text-3xl font-bold flex items-center justify-center">
                    {name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <p className="thai-font text-base font-semibold mt-1">{name}</p>
              </>
            )}
            <p className="thai-font text-sm opacity-85" aria-live="polite">{title}</p>
            {mode === 'set' && !first && (
              <p className="thai-font text-xs opacity-75">ตัวเลข {PIN_LENGTH} หลัก เก็บไว้ในเครื่องนี้เท่านั้น</p>
            )}
            {!compact && <p className="thai-font text-xs opacity-75">พิมพ์ตัวเลขบนคีย์บอร์ดได้เลย</p>}
            <p className="thai-font text-xs text-danger font-semibold h-4" role="alert">{message}</p>
          </div>
          <div className="mt-3">
            <PinPad onComplete={handlePin} shakeKey={shake} disabled={busy} dark={dark} showKeypad={compact} />
          </div>
        </div>

        <div className="mt-6">
          {mode === 'unlock' ? (
            <button type="button" onClick={forgot} className={`${linkBase} ${linkTone}`}>
              ลืมรหัสผ่าน? ออกจากระบบแล้วเข้าใหม่ด้วย Google
            </button>
          ) : (
            <button type="button" onClick={() => signOut()} className={`${linkBase} ${linkTone}`}>
              ไม่ใช่คุณ? ออกจากระบบ
            </button>
          )}
        </div>
      </div>
    </Wallpaper>
  )
}
