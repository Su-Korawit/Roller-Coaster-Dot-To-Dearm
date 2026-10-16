import { mbtiColor } from '../../constants/mbtiColors'

// User avatar circle with optional MBTI-colored ring + emoji fallback.
// size: Tailwind width/height class, e.g. "w-10 h-10" (default)
// mbti: if provided, draws a 2px ring in the MBTI color
export default function Avatar({ photoURL, mbti, size = 'w-10 h-10', className = '' }) {
  const ring = mbti ? `ring-2 ring-offset-1` : ''
  const ringColor = mbti ? mbtiColor(mbti) : undefined

  return (
    <div
      className={`${size} rounded-full overflow-hidden flex items-center justify-center bg-brand-soft shrink-0 ${ring} ${className}`}
      style={ringColor ? { ringColor, boxShadow: `0 0 0 2px ${ringColor}` } : undefined}
    >
      {photoURL
        ? <img src={photoURL} alt="" className="w-full h-full object-cover" />
        : <span className="text-lg" aria-hidden="true">🎮</span>
      }
    </div>
  )
}
