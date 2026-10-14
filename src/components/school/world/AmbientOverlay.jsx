// Night-library ambience for all-day AFK: a cool tint plus falling rain. Pure CSS,
// pointer-events none, and still (no rain animation) under prefers-reduced-motion.
export default function AmbientOverlay() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden" aria-hidden="true" data-testid="ambient">
      <div className="absolute inset-0 bg-[#0d1f3c]/35 mix-blend-multiply" />
      <div className="rain-layer" />
    </div>
  )
}
