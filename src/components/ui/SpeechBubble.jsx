import AtlasIcon from './AtlasIcon'

// A host's speech bubble (the Guide, later one-time tips). A polite live region so a screen reader
// announces each new step; the host avatar is the "?" icon until pets ship.
export default function SpeechBubble({ children, className = '', style }) {
  return (
    <div
      role="status"
      className={`px-slab bg-paper p-3 flex items-start gap-3 max-w-[min(20rem,92vw)] ${className}`}
      style={style}
    >
      <AtlasIcon name="guide" scale={2} className="mt-0.5" />
      <div className="min-w-0 flex flex-col gap-2 text-ink">{children}</div>
    </div>
  )
}
