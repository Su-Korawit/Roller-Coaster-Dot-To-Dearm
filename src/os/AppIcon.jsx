import { useRef, useState } from 'react'

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

export default function AppIcon({ app, onOpen, onLongPress, dark = false }) {
  const timer = useRef(null)
  const start = useRef(null)
  const fired = useRef(false)

  function cancel() {
    clearTimeout(timer.current)
    timer.current = null
  }

  function onPointerDown(e) {
    fired.current = false
    start.current = { x: e.clientX, y: e.clientY }
    cancel()
    timer.current = setTimeout(() => {
      fired.current = true
      onLongPress(app)
    }, LONG_PRESS_MS)
  }

  function onPointerMove(e) {
    if (!start.current || !timer.current) return
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_TOLERANCE) cancel()
  }

  function onClick() {
    if (fired.current) { fired.current = false; return }
    onOpen(app)
  }

  return (
    <button
      type="button"
      data-os-icon
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onClick={onClick}
      onContextMenu={(e) => { e.preventDefault(); cancel(); fired.current = true; onLongPress(app) }}
      aria-label={app.name}
      className="os-no-select flex flex-col items-center gap-1.5 p-1 rounded-ui active:scale-95 transition-transform
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <AppTile app={app} />
      <span className={`thai-font text-[12px] leading-tight text-center max-w-full truncate ${dark ? 'text-white' : 'text-ink'}`}>
        {app.name}
      </span>
    </button>
  )
}
