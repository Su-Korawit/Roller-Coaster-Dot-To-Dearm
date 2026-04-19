import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { registerAssets } from '../data/onboardingData'
import { useUserStore } from '../stores/useUserStore'

const LOOP_WORDS = ['Personal', 'Direction', 'Journey', 'Growth', 'Discovery', 'Future']

function RegisterPage() {
  const navigate = useNavigate()
  const setUser = useUserStore((state) => state.setUser)

  const [wordIndex, setWordIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const stay = setTimeout(() => {
      setVisible(false)
      const swap = setTimeout(() => {
        setWordIndex((i) => (i + 1) % LOOP_WORDS.length)
        setVisible(true)
      }, 500) // fade-out duration
      return () => clearTimeout(swap)
    }, 2000) // stay duration
    return () => clearTimeout(stay)
  }, [wordIndex])

  const handleStart = (provider) => {
    setUser({ name: 'Sakayanagi Arisu', provider })
    navigate('/select/mbti')
  }

  return (
    <section
      className="relative h-full overflow-hidden"
      style={{
        backgroundImage: `url(${registerAssets.bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <TopBar icon="♫" />

      <div className="mt-4 px-6 text-center">
        <h1 className="title-gradient pixel-font text-2xl leading-snug">Roller Coaster</h1>
        <p className="title-gradient pixel-font mt-2 text-xs leading-tight">The best solution</p>
        <p className="title-gradient pixel-font text-xs leading-tight">For self-discovery.</p>
      </div>

      <div className="mt-5 px-6 text-center">
        <div className="mx-auto mb-4 h-px w-full bg-black/80" />
        <p
          className="title-soft-gradient pixel-font text-xl py-4 transition-opacity duration-500"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {LOOP_WORDS[wordIndex]}
        </p>
      </div>

      <div className="mt-8 px-6 flex flex-col items-center w-full">
        <h2 className="text-center text-xl font-bold text-gray-900">ลงทะเบียนเพื่อเริ่มใช้งาน</h2>

        <button
          onClick={() => handleStart('google')}
          className="pixel-font mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-3xl bg-white px-5 text-sm text-gray-900 shadow-sm"
        >
          {/* Google logo SVG */}
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          <span className="whitespace-nowrap text-sm">Login with Google</span>
        </button>

        <button
          onClick={() => handleStart('microsoft')}
          className="pixel-font mt-3 flex h-14 w-full items-center justify-center gap-3 rounded-3xl bg-white px-5 text-sm text-gray-900 shadow-sm"
        >
          {/* Microsoft logo SVG */}
          <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
            <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
            <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
            <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
          </svg>
          <span className="whitespace-nowrap text-sm">Login with Microsoft</span>
        </button>
      </div>

      <button
        onClick={() => navigate('/why')}
        className="pixel-font absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-white"
      >
        <p className="text-xs">Start With Why?</p>
        <p className="text-2xl leading-none">▼</p>
      </button>
    </section>
  )
}

export default RegisterPage
