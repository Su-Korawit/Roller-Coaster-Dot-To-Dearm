import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { currentSite } from '../lib/site'
import Button from '../components/ui/Button'
import CharacterSprite from '../components/ui/CharacterSprite'
import SceneBackdrop from '../components/landing/SceneBackdrop'
import { markConsentPending, clearPendingConsent } from '../services/consent'
import { LEGAL_PATHS } from '../constants/legal'

const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'อีเมลนี้ถูกใช้งานแล้ว',
  'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
  'auth/user-not-found': 'ไม่พบบัญชีนี้',
  'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
  'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'auth/weak-password': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
  'auth/popup-closed-by-user': '',
  'auth/cancelled-popup-request': '',
  'auth/network-request-failed': 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต',
  'auth/unauthorized-domain': 'โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Console',
  'auth/operation-not-allowed': 'ยังไม่ได้เปิดใช้งานการเข้าสู่ระบบด้วย Google',
  'auth/popup-blocked': 'เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตแล้วลองใหม่',
  'auth/internal-error': 'เกิดข้อผิดพลาดภายใน กรุณาลองใหม่อีกครั้ง',
  'auth/configuration-not-found': 'การตั้งค่าการเข้าสู่ระบบยังไม่สมบูรณ์',
  'auth/invalid-api-key': 'การตั้งค่า Firebase ไม่ถูกต้อง',
}

function friendlyError(code) {
  return ERROR_MESSAGES[code] ?? `เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง (${code ?? 'unknown'})`
}

export default function AuthPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const signIn = useAuthStore((s) => s.signIn)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [confirmAge, setConfirmAge] = useState(false)
  const consentGiven = acceptTerms && confirmAge
  // Signing up (any method) and Google sign-in (which may create the account) need consent;
  // email login is for existing accounts, which ConsentGate covers if they have none on file.

  useEffect(() => {
    if (!user) return
    // Go back to where the visitor came from (e.g. /studio) when it is an on-site path.
    const back = location.state?.from
    const onSite = typeof back === 'string' && back.startsWith('/') && !back.startsWith('//') && !back.includes('\\')
    navigate(onSite ? back : currentSite === 'bag' ? '/' : '/home', { replace: true })
  }, [user, navigate, location.state])

  function switchMode(m) {
    setMode(m)
    setError('')
  }

  async function handleGoogle() {
    setError('')
    if (!consentGiven) { setError('กรุณายอมรับข้อกำหนดและยืนยันอายุก่อนเข้าสู่ระบบ'); return }
    markConsentPending()
    setBusy(true)
    try {
      await signIn('google')
    } catch (e) {
      clearPendingConsent()   // a failed attempt must not leave consent behind for a different account
      console.error('[auth] google sign-in failed:', e.code, e.message)
      const msg = friendlyError(e.code)
      if (msg) setError(msg)
    } finally {
      setBusy(false)
    }
  }

  async function handleEmail(e) {
    e.preventDefault()
    setError('')
    if (mode === 'register') {
      if (!consentGiven) { setError('กรุณายอมรับข้อกำหนดและยืนยันอายุก่อนสมัครสมาชิก'); return }
      markConsentPending()
    }
    setBusy(true)
    try {
      await signIn(mode === 'register' ? 'register' : 'login', { email, password })
    } catch (e) {
      clearPendingConsent()
      console.error('[auth] email sign-in failed:', e.code, e.message)
      setError(friendlyError(e.code))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="relative h-full overflow-hidden flex flex-col items-center justify-center px-6"
    >
      <SceneBackdrop />

      <div className="relative z-10 flex flex-col items-center mb-5">
        <div className="px-card px-7 pt-4 pb-5 text-center animate-pop">
          <h1 className="wordmark-font pixel-title text-xl leading-relaxed tracking-wide">I LOVE TCAS</h1>
          <p className="thai-font mt-1 text-sm md:text-base text-ink-soft">เส้นทางสู่ความสำเร็จของคุณ</p>
        </div>
        <div className="-mt-1" aria-hidden="true">
          <CharacterSprite code="INFP" scale={3} />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md md:max-w-lg px-card bg-paper p-5 md:p-6 animate-pop">
        <fieldset className="mb-4 space-y-2 thai-font text-xs text-ink">
            <legend className="sr-only">ข้อกำหนดและความยินยอม</legend>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5" />
              <span>
                ฉันได้อ่านและยอมรับ{' '}
                <a href={LEGAL_PATHS.terms} target="_blank" rel="noopener noreferrer" className="underline text-brand-strong">ข้อกำหนดการใช้งาน</a>
                {' '}และ{' '}
                <a href={LEGAL_PATHS.privacy} target="_blank" rel="noopener noreferrer" className="underline text-brand-strong">นโยบายความเป็นส่วนตัว</a>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={confirmAge} onChange={(e) => setConfirmAge(e.target.checked)} className="mt-0.5" />
              <span>ฉันอายุ 13 ปีขึ้นไป หรือได้รับความยินยอมจากผู้ปกครองแล้ว</span>
            </label>
            <p className="text-ink-soft">ต้องยอมรับก่อนสมัครสมาชิก หรือเข้าสู่ระบบด้วย Google</p>
        </fieldset>
        <button
          onClick={handleGoogle}
          disabled={busy}
          aria-label="เข้าสู่ระบบด้วย Google"
          className="px-btn w-full flex items-center justify-center gap-2.5 bg-paper rounded-xl py-3
            disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          <span className="thai-font text-sm text-ink">เข้าสู่ระบบด้วย Google</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-ink/10" />
          <span className="thai-font text-xs text-ink-soft">หรือ</span>
          <div className="flex-1 h-px bg-ink/10" />
        </div>

        <div
          className="flex rounded-xl border-2 border-line p-0.5 mb-4 bg-paper"
          role="tablist"
          aria-label="เลือกโหมด"
        >
          {['login', 'register'].map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 rounded-lg thai-font text-sm transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                ${mode === m ? 'px-pressed text-ink font-semibold border-2 border-line' : 'text-ink-soft hover:text-ink border-2 border-transparent'}`}
            >
              {m === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </button>
          ))}
        </div>

        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            aria-label="Email"
            className="px-input thai-font px-4 h-11 text-sm text-ink placeholder:text-ink-soft w-full"
          />
          <input
            type="password"
            placeholder="Password (6+ chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            aria-label="Password"
            className="px-input thai-font px-4 h-11 text-sm text-ink placeholder:text-ink-soft w-full"
          />

          {error && (
            <p className="thai-font text-xs text-danger text-center leading-relaxed" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy}>
            {busy ? '...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}
          </Button>
        </form>
      </div>

      <p className="relative z-10 mt-5 thai-font text-xs text-center text-white/70">
        I LOVE TCAS · v0.1
      </p>
    </section>
  )
}
