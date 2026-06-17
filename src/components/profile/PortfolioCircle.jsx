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
                'conic-gradient(#ec4899 0%, #fce7f3 25%, #ec4899 50%, #fce7f3 75%, #ec4899 100%)',
            }}
          />
        )}
        <div
          className={`relative z-10 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 ${isActive ? 'border-white' : 'border-gray-200'}`}
        >
          {image ? (
            <img src={image} alt={label} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-black" />
          )}
        </div>
        {/* Progress badge for mastery */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-[8px] rounded-full w-5 h-5 flex items-center justify-center font-bold z-20">
            {progress}%
          </div>
        )}
      </div>
      <span className="pixel-font text-[8px] text-gray-600">{label}</span>
    </button>
  )
}
