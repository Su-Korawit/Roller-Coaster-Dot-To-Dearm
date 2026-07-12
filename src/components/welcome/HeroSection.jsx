import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'

export default function HeroSection({ gamePreview, loading }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const onPlay = () => navigate(user ? '/home' : '/auth?mode=login')

  const hasMedia = !!gamePreview?.mediaUrl
  const { mediaUrl, mediaType } = gamePreview ?? {}
  const showMediaSkeleton = loading && !hasMedia

  return (
    <section className={`relative h-dvh overflow-hidden flex items-center justify-center ${!hasMedia && !showMediaSkeleton ? 'onboarding-bg' : ''}`}>
      {/* Preview media skeleton while Firestore resolves */}
      {showMediaSkeleton && (
        <div
          className="absolute inset-0 animate-pulse bg-paper"
          aria-hidden="true"
          data-testid="hero-media-skeleton"
        />
      )}

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
        <h1 className="pixel-font pixel-title-dark text-2xl md:text-5xl leading-relaxed">
          I LOVE TCAS
        </h1>
        <p className="thai-font mt-4 text-sm md:text-base text-white/70 whitespace-nowrap">
          วางแผนเข้ามหาลัย พบเพื่อน เล่นไปด้วย
        </p>
        <button
          onClick={onPlay}
          aria-label="Play"
          className="neo-btn mt-16 pixel-font text-[10px] text-white rounded-xl px-8 py-3 bg-brand-strong flex items-center gap-2"
        >
          <Play size={14} strokeWidth={2.5} aria-hidden="true" /> PLAY
        </button>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 animate-scroll-hint"
        aria-hidden="true"
      >
        <span className="pixel-font text-[10px] tracking-widest">SCROLL</span>
        <span className="text-lg">↓</span>
      </div>
    </section>
  )
}
