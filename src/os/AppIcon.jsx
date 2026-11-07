import { useEffect, useRef, useState } from 'react'

const LONG_PRESS_MS = 450
const MOVE_TOLERANCE = 8

// Square app tile. Tap → onOpen, long-press (or right-click) → onLongPress (details).
// With `app.logo` the tile shows that picture on white; if it fails to load (or is missing),
// it falls back to the lucide icon on the tone colour.
export function AppTile({ app, size = 60 }) {
  const { Icon } = app
  const [broken, setBroken] = useState(false)
  const showLogo = !!app.logo && !broken
  return (
    <span
      className="px-card flex items-center justify-center text-white overflow-hidden"
      style={{ width: size, height: size, background: showLogo ? 'var(--color-paper)' : app.tone, borderRadius: 'var(--radius-slot)' }}
      aria-hidden="true"
    >
      {showLogo ? (
        <img
          src={app.logo}
          alt=""
          draggable={false}
          onError={() => setBroken(true)}
          className={`w-full h-full ${app.logoFull ? 'object-cover' : 'object-contain p-[12%]'}`}
        />
      ) : (
        <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} />
      )}
    </span>
  )
}

const EDGE_PX = 56

// Home-screen icon. Tap → open. Right-click, or hold and release without moving → details.
// Drag (mouse: just move; touch: hold first) → pick the icon up and drop it on another icon to
// reorder (built-in apps stay put). Near the left/right edge it asks Home to flip the page.
export default function AppIcon({ app, onOpen, onLongPress, dark = false, draggable = false, onMove, onEdge, getScrollLeft }) {
  const timer = useRef(null)
  const start = useRef(null)
  const fired = useRef(false)      // a hold or drag happened: swallow the click that follows
  const [drag, setDrag] = useState(null)   // { x, y } offset while carried

  function cancel() {
    clearTimeout(timer.current)
    timer.current = null
  }

  function begin() {
    fired.current = true
    setDrag({ x: 0, y: 0 })
    if (start.current) start.current.scroll0 = getScrollLeft?.() ?? 0
  }

  // While carrying with a finger, stop the page from scrolling under it.
  useEffect(() => {
    if (!drag) return undefined
    const block = (e) => e.preventDefault()
    window.addEventListener('touchmove', block, { passive: false })
    return () => window.removeEventListener('touchmove', block)
  }, [drag])

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return
    fired.current = false
    start.current = { x: e.clientX, y: e.clientY, scroll0: 0, moved: false, mouse: e.pointerType === 'mouse' }
    cancel()
    timer.current = setTimeout(() => {
      timer.current = null
      if (draggable) begin()
      else { fired.current = true; onLongPress(app) }
    }, LONG_PRESS_MS)
  }

  function onPointerMove(e) {
    const st = start.current
    if (!st) return
    const dist = Math.hypot(e.clientX - st.x, e.clientY - st.y)
    if (!drag) {
      if (dist <= MOVE_TOLERANCE) return
      if (draggable && st.mouse && timer.current) { cancel(); begin(); e.currentTarget.setPointerCapture?.(e.pointerId) }
      else cancel()
      return
    }
    if (dist > MOVE_TOLERANCE) st.moved = true
    const dScroll = (getScrollLeft?.() ?? 0) - st.scroll0
    setDrag({ x: e.clientX - st.x + dScroll, y: e.clientY - st.y })
    if (e.clientX < EDGE_PX) onEdge?.(-1, e.timeStamp)
    else if (e.clientX > window.innerWidth - EDGE_PX) onEdge?.(1, e.timeStamp)
  }

  function finish(e, dropped) {
    cancel()
    const st = start.current
    start.current = null
    if (!drag) return
    setDrag(null)
    if (!dropped) return
    if (!st?.moved) { onLongPress(app); return }      // held without moving → details
    const under = document.elementsFromPoint(e.clientX, e.clientY)
      .map((el) => el.closest?.('[data-app-id]'))
      .find((el) => el && el.dataset.appId !== app.id)
    if (under && under.dataset.draggable === '1') onMove?.(app.id, under.dataset.appId)
  }

  function onClick() {
    if (fired.current) { fired.current = false; return }
    onOpen(app)
  }

  return (
    <button
      type="button"
      data-os-icon
      data-app-id={app.id}
      data-draggable={draggable ? '1' : '0'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, true)}
      onPointerLeave={() => { if (!drag) cancel() }}
      onPointerCancel={(e) => finish(e, false)}
      onClick={onClick}
      onContextMenu={(e) => { e.preventDefault(); cancel(); if (!drag) { fired.current = true; onLongPress(app) } }}
      aria-label={app.name}
      style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px) scale(1.12)`, zIndex: 40, position: 'relative', filter: 'drop-shadow(0 6px 6px rgb(0 0 0 / 0.3))', touchAction: 'none' } : undefined}
      className={`os-no-select flex flex-col items-center gap-1.5 p-1 rounded-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
        ${drag ? 'cursor-grabbing' : 'active:scale-95 transition-transform'}`}
    >
      <AppTile app={app} />
      <span className={`thai-font text-[12px] leading-tight text-center max-w-full truncate ${dark ? 'text-white' : 'text-ink'}`}>
        {app.name}
      </span>
    </button>
  )
}
