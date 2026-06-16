import { useEffect, useRef } from 'react'

// Flow-space pixels per month at zoom = 1. Ticks live in flow space and are
// scaled by the live viewport so the ruler always lines up with the blocks.
const PX_PER_MONTH = 120
const TOTAL_MONTHS = 120 // 10 years of scrollable range
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Granularity adapts to zoom: zoomed out -> years, normal -> months, zoomed in -> weeks.
function tickConfig(zoom) {
  if (zoom < 0.4) return { stepMonths: 12, label: (m) => `Y${Math.round(m / 12)}` }
  if (zoom > 1.5) return { stepMonths: 0.25, label: (m) => `W${Math.round(m / 0.25) % 4 + 1}` }
  return { stepMonths: 1, label: (m) => MONTHS[((Math.round(m) % 12) + 12) % 12] }
}

// Bottom ruler synced both ways with the ReactFlow viewport.
// - Panning the canvas drives this strip's scrollLeft (via the `viewport` prop).
// - Scrolling this strip pans the canvas (via `onScrub`).
export default function TimelineRuler({ viewport, onScrub }) {
  const scrollerRef = useRef(null)
  const syncingRef = useRef(false)
  const { x, zoom } = viewport

  // Canvas pan/zoom -> ruler scroll position.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    syncingRef.current = true
    el.scrollLeft = -x
    // Release the guard after the scroll event has fired.
    const id = requestAnimationFrame(() => { syncingRef.current = false })
    return () => cancelAnimationFrame(id)
  }, [x])

  // Ruler scroll -> canvas pan. Guarded so canvas-driven scrolls don't echo back.
  const onScroll = () => {
    if (syncingRef.current) return
    onScrub(-scrollerRef.current.scrollLeft)
  }

  const { stepMonths, label } = tickConfig(zoom)
  const ticks = []
  for (let m = 0; m <= TOTAL_MONTHS; m += stepMonths) {
    ticks.push({ m, left: m * PX_PER_MONTH * zoom })
  }

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className="absolute bottom-0 left-0 right-0 h-10 bg-white/80 backdrop-blur-sm border-t border-gray-100 overflow-x-auto overflow-y-hidden"
    >
      <div className="relative h-full" style={{ width: TOTAL_MONTHS * PX_PER_MONTH * zoom }}>
        {ticks.map(({ m, left }) => (
          <div key={m} className="absolute top-0 flex flex-col items-center" style={{ left }}>
            <div className="w-px h-2 bg-gray-300" />
            <span className="pixel-font text-[7px] text-gray-400 mt-0.5">{label(m)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
