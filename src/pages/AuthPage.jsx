import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { currentSite } from '../lib/site'
import Button from '../components/ui/Button'

const STARS = Array.from({ length: 50 }, (_, i) => {
  const seed = i * 2654435761
  return {
    width: `${((seed % 3) + 1)}px`,
    height: `${((seed % 3) + 1)}px`,
    top: `${((seed * 7) % 100)}%`,
    left: `${((seed * 13) % 100)}%`,
    opacity: ((seed % 6) + 3) / 10,
  }
})

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
  const user = useAuthStore((s) => s.user)
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const signIn = useAuthStore((s) => s.signIn)

  useEffect(() => {
    if (user) navigate(currentSite === 'bag' ? '/' : '/home', { replace: true })
  }, [user, navigate])

  function switchMode(m) {
    setMode(m)
    setError('')
  }

  async function handleGoogle() {
    setError('')
    setBusy(true)
    try {
      await signIn('google')
    } catch (e) {
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
    setBusy(true)
    try {
      await signIn(mode === 'register' ? 'register' : 'login', { email, password })
    } catch (e) {
      console.error('[auth] email sign-in failed:', e.code, e.message)
      setError(friendlyError(e.code))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="relative h-full overflow-hidden flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #0f0824 0%, #1a1035 50%, #0d1f3c 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={s} />
        ))}
      </div>

      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: '320px',
          height: '320px',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(167,139,218,0.12) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center mb-7">
        <div className="mb-4 flex h-16 w-16 items-center justify-center neo-card bg-surface">
          <span className="pixel-font text-xl text-brand-strong" aria-hidden="true">ILT</span>
        </div>
        <h1 className="pixel-font pixel-title-dark text-xl text-center leading-relaxed tracking-wide">
          I LOVE TCAS
        </h1>
        <p className="thai-font mt-2 text-sm md:text-base text-white/70">
          เส้นทางสู่ความสำเร็จของคุณ
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md md:max-w-lg neo-card bg-paper p-5 md:p-6">
        <button
          onClick={handleGoogle}
          disabled={busy}
          aria-label="เข้าสู่ระบบด้วย Google"
          className="neo-btn w-full flex items-center justify-center gap-2.5 bg-surface rounded-xl py-3
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
          className="flex rounded-xl border-2 border-ink p-0.5 mb-4 bg-surface"
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
                ${mode === m ? 'neo-pressed text-ink font-semibold border-2 border-ink' : 'text-ink-soft hover:text-ink border-2 border-transparent'}`}
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
            className="neo-input thai-font px-4 h-11 text-sm text-ink placeholder:text-ink-soft w-full"
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
            className="neo-input thai-font px-4 h-11 text-sm text-ink placeholder:text-ink-soft w-full"
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

      <p className="relative z-10 mt-5 thai-font text-xs text-center text-white/30">
        I LOVE TCAS · v0.1
      </p>
    </section>
  )
}
