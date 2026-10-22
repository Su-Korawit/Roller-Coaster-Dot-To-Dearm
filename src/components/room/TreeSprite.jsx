import focusAtlas from '../../../public/assets/rc/focus.json'

const FRAME = 48
const COLS = 4
const ROWS = Object.keys(focusAtlas.sprites).length

// A tree (or the withered tree) from the generated focus sheet. `stage` 0..3 is its growth.
export default function TreeSprite({ species, stage = 3, scale = 2, className = '' }) {
  const key = species === 'withered' ? 'tree_withered' : `tree_${species}`
  const row = focusAtlas.sprites[key]?.row ?? 0
  const col = species === 'withered' ? 0 : Math.min(3, Math.max(0, stage))
  const px = FRAME * scale
  return (
    <span
      aria-hidden="true"
      className={`inline-block ${className}`}
      style={{
        width: px,
        height: px,
        backgroundImage: 'url(/assets/rc/focus.png)',
        backgroundSize: `${COLS * px}px ${ROWS * px}px`,
        backgroundPosition: `-${col * px}px -${row * px}px`,
        imageRendering: 'pixelated',
      }}
    />
  )
}
