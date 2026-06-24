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
        style={{ background: 'rgba(26,16,53,0.45)' }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <h1 className="pixel-font title-gradient text-2xl md:text-5xl leading-relaxed">
          ROLLER COASTER
        </h1>
        <p
          className="mt-4 text-sm md:text-base text-white/70 whitespace-nowrap"
          style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
        >
          วางแผนอนาคต · เชื่อมต่อเพื่อน · เรียนรู้ผ่านเกม
        </p>
        <button
          onClick={onPlay}
          className="neo-btn mt-16 pixel-font text-[10px] text-white rounded-xl px-8 py-3 bg-brand-strong"
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
