import { useState } from 'react'
import { useAuthStore } from '../stores/useAuthStore'
import { markConsentPending, clearPendingConsent } from '../services/consent'
import { LEGAL_PATHS } from '../constants/legal'
import Wallpaper from './Wallpaper'
import { useWallpaperDark } from './useWallpaperDark'
import { useClock, formatTime, formatDate } from './hooks'

const ERRORS = {
  'auth/popup-closed-by-user': '',
  'auth/cancelled-popup-request': '',
  'auth/network-request-failed': 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต',
  'auth/unauthorized-domain': 'โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Console',
  'auth/operation-not-allowed': 'ยังไม่ได้เปิดใช้งานการเข้าสู่ระบบด้วย Google',
  'auth/popup-blocked': 'เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตแล้วลองใหม่',
}

// First screen of the OS: the device is "off" until the owner signs in with Google.
export default function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn)
  const now = useClock()
  const dark = useWallpaperDark()
  const [terms, setTerms] = useState(false)
  const [age, setAge] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogle() {
    setError('')
    if (!terms || !age) { setError('กรุณายอมรับข้อกำหนดและยืนยันอายุก่อนเข้าสู่ระบบ'); return }
    markConsentPending()
    setBusy(true)
    try {
      await signIn('google')
    } catch (e) {
      clearPendingConsent()   // a failed attempt must not leave consent behind for a different account
      console.error('[os] google sign-in failed:', e.code, e.message)
      const msg = ERRORS[e.code]
      if (msg !== '') setError(msg ?? `เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง (${e.code ?? 'unknown'})`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Wallpaper scroll className="flex flex-col items-center px-6">
      <div className="relative z-10 mt-[10vh] text-center os-no-select">
        <p className="font-display text-7xl sm:text-8xl lg:text-9xl font-bold tracking-tight leading-none">{formatTime(now)}</p>
        <p className="thai-font mt-2 text-lg sm:text-xl opacity-85">{formatDate(now)}</p>
      </div>

      <div className="relative z-10 mt-auto mb-[8vh] w-full max-w-sm">
        <h1 className="wordmark-font text-center text-lg mb-4 leading-relaxed">I LOVE TCAS</h1>
        <div className="px-card p-5 animate-pop text-ink">
          <fieldset className="mb-4 space-y-2 thai-font text-xs">
            <legend className="sr-only">ข้อกำหนดและความยินยอม</legend>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5" />
              <span>
                ฉันได้อ่านและยอมรับ{' '}
                <a href={LEGAL_PATHS.terms} target="_blank" rel="noopener noreferrer" className="underline text-brand-strong">ข้อกำหนดการใช้งาน</a>
                {' '}และ{' '}
                <a href={LEGAL_PATHS.privacy} target="_blank" rel="noopener noreferrer" className="underline text-brand-strong">นโยบายความเป็นส่วนตัว</a>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} className="mt-0.5" />
              <span>ฉันอายุ 20 ปีขึ้นไป หรือได้รับความยินยอมจากผู้ปกครองแล้ว</span>
            </label>
          </fieldset>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            aria-label="เข้าสู่ระบบด้วย Google"
            className="px-btn w-full flex items-center justify-center gap-2.5 bg-paper rounded-xl py-3
              disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span className="thai-font text-sm">{busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}</span>
          </button>

          {error && (
            <p className="thai-font text-xs text-danger text-center leading-relaxed mt-3" role="alert">{error}</p>
          )}
        </div>
        <p className={`thai-font text-xs text-center mt-3 ${dark ? 'text-white/70' : 'text-ink-soft'}`}>
          ล็อกอินครั้งแรก แล้วตั้งรหัสผ่านสำหรับเครื่องนี้
        </p>
      </div>
    </Wallpaper>
  )
}
