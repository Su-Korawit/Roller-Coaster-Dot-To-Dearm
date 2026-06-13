import { useState } from 'react'
import { useAuthStore } from '../stores/useAuthStore'

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
}

function friendlyError(code) {
  return ERROR_MESSAGES[code] ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}

const bodyFont = { fontFamily: "'Noto Sans Thai', sans-serif" }

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const signIn = useAuthStore((s) => s.signIn)

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
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={s} />
        ))}
      </div>

      {/* Glow orb */}
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

      {/* Logo block */}
      <div className="relative z-10 flex flex-col items-center mb-7">
        <span
          className="text-6xl md:text-7xl mb-4"
          style={{ filter: 'drop-shadow(0 0 12px rgba(167,139,218,0.6))' }}
          aria-hidden="true"
        >
          🎢
        </span>
        <h1 className="pixel-font text-[13px] md:text-[16px] text-center title-gradient leading-relaxed tracking-wide">
          RollerCoaster
        </h1>
        <p className="mt-2 text-sm md:text-base text-purple-300/70" style={bodyFont}>
          เส้นทางสู่ความสำเร็จของคุณ
        </p>
      </div>

      {/* Auth card */}
      <div
        className="relative z-10 w-full max-w-md md:max-w-lg rounded-3xl p-5 md:p-6 border shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={busy}
          aria-label="เข้าสู่ระบบด้วย Google"
          className="w-full flex items-center justify-center gap-2.5 bg-white rounded-2xl py-3 shadow-lg
            active:scale-95 transition-transform disabled:opacity-50
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          <span className="text-sm text-gray-700" style={bodyFont}>เข้าสู่ระบบด้วย Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', ...bodyFont }}>หรือ</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Login / Register toggle */}
        <div
          className="flex rounded-2xl p-0.5 mb-4"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          role="tablist"
          aria-label="เลือกโหมด"
        >
          {['login', 'register'].map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                ${mode === m ? 'bg-white text-gray-800 shadow font-semibold' : 'text-white/50 hover:text-white/70'}`}
              style={bodyFont}
            >
              {m === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </button>
          ))}
        </div>

        {/* Email + Password form */}
        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            aria-label="Email"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
            style={{
              ...bodyFont,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              caretColor: '#a78bda',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#a78bda')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
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
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
            style={{
              ...bodyFont,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              caretColor: '#a78bda',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#a78bda')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
          />

          {error && (
            <p className="text-sm text-red-300 text-center leading-relaxed" style={bodyFont} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-2xl text-sm text-white font-semibold shadow-lg
              active:scale-95 transition-transform disabled:opacity-50
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
            style={{ background: 'linear-gradient(135deg, #a78bda, #7c5cbf)', ...bodyFont }}
          >
            {busy ? '...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p
        className="relative z-10 mt-5 text-xs text-center"
        style={{ color: 'rgba(255,255,255,0.2)', ...bodyFont }}
      >
        RollerCoaster · v0.1
      </p>
    </section>
  )
}
