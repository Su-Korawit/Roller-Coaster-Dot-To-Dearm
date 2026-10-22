import { useEffect, useState } from 'react'

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Full-screen cover shown while a map loads: a 400 ms pixel-style iris closing and opening
// (or a short fade when the player prefers reduced motion). Never takes clicks, and it removes
// itself shortly after `active` ends, so a failed map load cannot leave a stuck screen.
export default function WarpTransition({ active }) {
  const reduced = reducedMotion()
  // After `active` ends the cover lingers for its closing animation, then unmounts.
  const [wasActive, setWasActive] = useState(active)
  const [lingering, setLingering] = useState(false)
  if (active !== wasActive) {
    setWasActive(active)
    setLingering(!active)
  }

  useEffect(() => {
    if (!lingering) return undefined
    const t = setTimeout(() => setLingering(false), reduced ? 200 : 450)
    return () => clearTimeout(t)
  }, [lingering, reduced])

  if (!active && !lingering) return null
  const style = reduced
    ? { opacity: active ? 1 : 0, transition: 'opacity 150ms linear' }
    : { clipPath: `circle(${active ? 150 : 0}% at 50% 50%)`, transition: 'clip-path 400ms steps(8, end)' }
  return (
    <div
      aria-hidden="true"
      data-warp={reduced ? 'fade' : 'iris'}
      className="absolute inset-0 bg-ink pointer-events-none"
      style={{ zIndex: 45, ...style }}
    />
  )
}
