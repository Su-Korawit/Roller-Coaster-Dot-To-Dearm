// Cozy pixel scenery for title screens and hero bands: the School Hub map as a
// backdrop, a sky tint that fades into the content, and slow stepped clouds.
// Purely decorative (aria-hidden) and static under prefers-reduced-motion.
// The parent must be `relative overflow-hidden`; content goes in a `relative z-10` sibling.

const CLOUDS = [
  { top: '7%', w: 160, delay: '0s' },
  { top: '17%', w: 112, delay: '-40s' },
  { top: '4%', w: 96, delay: '-70s' },
]

export default function SceneBackdrop({ position = 'center 62%', shade = 0.55, clouds = true }) {
  return (
    <>
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundColor: '#8ec9d8',
          backgroundImage: 'url(/assets/ui/backdrops/school-hub.png)',
          backgroundSize: 'cover',
          backgroundPosition: position,
          imageRendering: 'pixelated',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: `linear-gradient(180deg, rgba(142,201,216,0.78) 0%, rgba(142,201,216,0.15) 45%, rgba(75,51,64,${shade}) 100%)`,
        }}
      />
      {clouds && CLOUDS.map((c) => (
        <img
          key={c.top}
          src="/assets/ui/backdrops/cloud.png"
          alt=""
          aria-hidden="true"
          className="px-cloud pointer-events-none"
          style={{ top: c.top, width: c.w, animationDelay: c.delay }}
        />
      ))}
    </>
  )
}
