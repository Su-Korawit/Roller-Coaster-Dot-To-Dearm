// Pixel sprite icon rendered at an integer scale (crisp, never smoothed).
// size = source pixels per side; scale = integer multiplier. Empty alt = decorative.
export default function PxIcon({ src, size = 20, scale = 2, alt = '', className = '' }) {
  const px = size * scale
  return (
    <img
      src={src}
      alt={alt}
      width={px}
      height={px}
      draggable={false}
      aria-hidden={alt ? undefined : 'true'}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
