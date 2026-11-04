import atlas from '../../../public/assets/rc/icons.json'

// One sprite of the generated icon sheet (public/assets/rc/icons.png, one icon per row), drawn
// at an integer scale so it stays crisp. Decorative: the caller labels the control.
export default function AtlasIcon({ name, scale = 2, className = '' }) {
  const row = atlas.sprites[name]?.row ?? 0
  const size = atlas.frameW * scale
  return (
    <span
      aria-hidden="true"
      data-icon={name}
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: 'url(/assets/rc/icons.png)',
        backgroundSize: `${size}px auto`,
        backgroundPosition: `0 -${row * size}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  )
}
