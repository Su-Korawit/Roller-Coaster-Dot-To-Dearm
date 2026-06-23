import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

export default function HeroSection() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const onPlay = () => navigate(user ? '/home' : '/auth?mode=login')

  return (
    <section className="onboarding-bg px-6 py-16 md:py-24 flex flex-col items-center text-center">
      <span className="text-6xl md:text-7xl mb-5" aria-hidden="true">🎢</span>
      <h1 className="pixel-font title-gradient text-2xl md:text-4xl leading-relaxed">
        ROLLER COASTER
      </h1>
      <p className="thai-font mt-4 max-w-xl text-base md:text-lg text-ink/70">
        วางแผนเส้นทางอนาคตของคุณด้วย AI เชื่อมต่อกับเพื่อนที่ใช่ และเรียนรู้ผ่านโลกเกม
      </p>

      <div className="mt-8 flex w-full max-w-md flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => navigate('/auth?mode=register')}
          className="neo-btn pixel-font text-[10px] text-white rounded-2xl px-6 py-4 min-h-11 bg-accent-pink"
        >
          REGISTER
        </button>
        <button
          onClick={() => navigate('/auth?mode=login')}
          className="neo-btn pixel-font text-[10px] text-ink rounded-2xl px-6 py-4 min-h-11 bg-surface"
        >
          LOGIN
        </button>
        <button
          onClick={onPlay}
          className="neo-btn pixel-font text-[10px] text-white rounded-2xl px-6 py-4 min-h-11 bg-brand-strong"
        >
          ▶ PLAY
        </button>
      </div>
    </section>
  )
}
