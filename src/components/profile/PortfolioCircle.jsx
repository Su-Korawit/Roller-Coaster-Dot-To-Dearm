import { useRef } from 'react'

// Tap = select; long-press (500ms) = edit. Extracted from ProfilePanel.
export default function PortfolioCircle({ label, image, progress, isActive, onPress, onLongPress }) {
  const timerRef = useRef(null)
  const longFired = useRef(false)

  function startPress() {
    longFired.current = false
    timerRef.current = setTimeout(() => {
      longFired.current = true
      onLongPress()
    }, 500)
  }

  function endPress() {
    clearTimeout(timerRef.current)
    if (!longFired.current) onPress()
    longFired.current = false
  }

  function cancelPress() {
    clearTimeout(timerRef.current)
    longFired.current = false
  }

  return (
    <button
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={cancelPress}
      className="flex flex-col items-center gap-1.5 select-none"
    >
      <div className="relative">
        {/* Spinning gradient ring when active */}
        {isActive && (
          <div
            className="absolute -inset-1 rounded-full animate-spin"
            style={{
              background:
                'conic-gradient(var(--color-accent-pink) 0%, var(--color-zone-arts-soft) 25%, var(--color-accent-pink) 50%, var(--color-zone-arts-soft) 75%, var(--color-accent-pink) 100%)',
            }}
          />
        )}
        <div
          className={`relative z-10 w-16 h-16 rounded-full bg-brand-soft flex items-center justify-center overflow-hidden border-2 ${isActive ? 'border-paper' : 'border-ink/10'}`}
        >
          {image ? (
            <img src={image} alt={label} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-black" />
          )}
        </div>
        {/* Progress badge for mastery */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold z-20">
            {progress}%
          </div>
        )}
      </div>
      <span className="pixel-font text-xs text-ink-soft">{label}</span>
    </button>
  )
}
