import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

export default function HeroSection({ gamePreview }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const onPlay = () => navigate(user ? '/home' : '/auth?mode=login')

  const hasMedia = !!gamePreview?.mediaUrl
  const { mediaUrl, mediaType } = gamePreview ?? {}

  return (
    <section className={`relative h-dvh overflow-hidden flex items-center justify-center ${!hasMedia ? 'onboarding-bg' : ''}`}>
      {/* Video / GIF background */}
      {hasMedia && (
        mediaType === 'video' ? (
          <video
            src={mediaUrl}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay loop muted playsInline
            aria-hidden="true"
          />
        ) : (
          <img
            src={mediaUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )
      )}

      {/* Dark overlay (always shown — softens video, deepens gradient) */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(26,16,53,0.6)' }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <span className="text-6xl md:text-8xl mb-4" aria-hidden="true">🎢</span>
        <h1 className="pixel-font title-gradient text-2xl md:text-5xl leading-relaxed">
          ROLLER COASTER
        </h1>
        <p
          className="mt-4 max-w-xl text-base md:text-lg text-white/70"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
        >
          วางแผนเส้นทางอนาคตของคุณด้วย AI เชื่อมต่อกับเพื่อนที่ใช่ และเรียนรู้ผ่านโลกเกม
        </p>
        <button
          onClick={onPlay}
          className="neo-btn mt-10 pixel-font text-[13px] text-white rounded-2xl px-12 py-5 bg-brand-strong"
        >
          ▶ PLAY
        </button>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 animate-bounce"
        aria-hidden="true"
      >
        <span className="pixel-font text-[8px] tracking-widest">SCROLL</span>
        <span className="text-lg">↓</span>
      </div>
    </section>
  )
}
