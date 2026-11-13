import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { X, Minus, Maximize2, Minimize2, CircleHelp } from 'lucide-react'
import { Z_PANEL } from '../constants/zIndex'
import AppSplash from './splash/AppSplash'
import { AppTile } from './AppIcon'
import { hasSplash } from './splash/splashLogic'
import { TASKBAR_H, centredPos, clampPos, windowSize } from './windowsLogic'
import { APP_HELP } from './guideContent'
import { shortcutsFor } from './relatedApps'
import { findApp } from './apps'
import { useOsStore } from '../stores/useOsStore'

const CLOSE_MS = 200
const SNAP_TOP_PX = 4   // letting go of a dragged window at the very top maximizes it

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useViewport() {
  const [vp, setVp] = useState(() => ({ vw: window.innerWidth, vh: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setVp({ vw: window.innerWidth, vh: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return vp
}

// An open app. Full screen on phones/tablets; on desktop a draggable window that can be
// minimized to the taskbar, maximized and restored. Minimized windows stay mounted (state kept).
// Motion (see os.css): spring-in on open, glide on maximize/restore, shrink toward the taskbar on
// minimize, fade-out on close. Dragging moves the window with a GPU transform, so it follows the
// pointer without re-rendering React on every move; the position is saved when you let go.
export default function AppWindow({ win, index, isTop, desktop, onClose, onMinimize, onMaximize, onFocus, onMove, onOpenApp }) {
  const { app, minimized, maximized, pos } = win
  const { Component } = app
  const { vw, vh } = useViewport()
  const root = useRef(null)
  const drag = useRef(null)      // { dx, dy, x, y, raf } while carried
  const [dragging, setDragging] = useState(false)
  const [closing, setClosing] = useState(false)
  const [splashDone, setSplashDone] = useState(() => !hasSplash(app))
  const [help, setHelp] = useState(false)
  const installed = useOsStore((s) => s.installed)
  const tips = APP_HELP[app.id]
  const shortcuts = shortcutsFor(app.id, (id) => { const a = findApp(id); return !!a && (a.builtIn || installed.includes(id)) })
    .map((id) => findApp(id))

  const size = windowSize(vw, vh)
  const at = clampPos(pos ?? centredPos(vw, vh), size, vw, vh)
  const full = !desktop || maximized

  // Play the close animation, then really close.
  const requestClose = useCallback(() => {
    if (closing) return
    if (prefersReducedMotion()) { onClose(win.id); return }
    setClosing(true)
    setTimeout(() => onClose(win.id), CLOSE_MS)
  }, [closing, onClose, win.id])

  useEffect(() => {
    if (!isTop) return undefined
    function onKey(e) { if (e.key === 'Escape') requestClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isTop, requestClose])

  // The saved position arrived: drop the temporary drag transform in the same frame.
  useLayoutEffect(() => {
    if (root.current && !drag.current) root.current.style.transform = ''
  }, [pos?.x, pos?.y])

  const style = { zIndex: Z_PANEL + index }
  if (desktop) {
    Object.assign(style, maximized
      ? { left: 0, top: 0, width: '100vw', height: `calc(100vh - ${TASKBAR_H}px)` }
      : { left: at.x, top: at.y, width: size.w, height: size.h })
  }

  function onDown(e) {
    if (!desktop || maximized || e.button !== 0 || e.target.closest('button')) return
    drag.current = { dx: e.clientX - at.x, dy: e.clientY - at.y, x: at.x, y: at.y, raf: 0 }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onDrag(e) {
    const d = drag.current
    if (!d) return
    const next = clampPos({ x: e.clientX - d.dx, y: e.clientY - d.dy }, size, vw, vh)
    d.x = next.x
    d.y = next.y
    if (d.raf) return
    d.raf = requestAnimationFrame(() => {
      d.raf = 0
      if (root.current) root.current.style.transform = `translate3d(${d.x - at.x}px, ${d.y - at.y}px, 0)`
    })
  }
  function onUp(e) {
    const d = drag.current
    if (d) {
      cancelAnimationFrame(d.raf)
      drag.current = null
      setDragging(false)
      if (d.x !== at.x || d.y !== at.y) onMove(win.id, { x: d.x, y: d.y })
      else if (root.current) root.current.style.transform = ''
      if (d.y <= SNAP_TOP_PX && e.type === 'pointerup') onMaximize(win.id)
    }
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const btn = 'w-8 h-8 flex items-center justify-center rounded-ui hover:bg-brand-soft active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
  const motion = `${minimized ? 'os-win-min' : ''} ${closing ? 'os-win-out' : ''} ${dragging ? 'os-win-drag' : ''}`
  return (
    <div
      ref={root}
      role="dialog"
      aria-label={app.name}
      aria-hidden={minimized || undefined}
      onPointerDownCapture={() => { if (!isTop) onFocus(win.id) }}
      className={`os-win os-win-enter px-card bg-paper text-ink flex flex-col fixed ${motion} ${full ? 'rounded-none border-0' : 'rounded-[var(--radius-ui)] border-2'} ${desktop ? '' : 'inset-0'}`}
      style={style}
    >
      <header
        onPointerDown={onDown}
        onPointerMove={onDrag}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={(e) => { if (desktop && !e.target.closest('button')) onMaximize(win.id) }}
        className={`flex items-center gap-2 px-3 h-11 shrink-0 border-b-2 border-hairline bg-mist os-no-select ${desktop && !maximized ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
      >
        {(app.logo || app.Icon) && <AppTile app={app} size={30} />}
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="thai-font font-bold text-sm truncate">{app.name}</h2>
          {app.tagline && <p className="thai-font text-xs text-ink-soft truncate hidden sm:block">{app.tagline}</p>}
        </div>
        {shortcuts.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 pr-1 mr-1 border-r-2 border-hairline" role="group" aria-label="แอปที่เกี่ยวข้อง">
            {shortcuts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onOpenApp(a)}
                aria-label={`เปิด ${a.name}`}
                title={`เปิด ${a.name}`}
                className="rounded-ui opacity-70 hover:opacity-100 active:scale-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <AppTile app={a} size={24} />
              </button>
            ))}
          </div>
        )}
        {tips && (
          <button type="button" onClick={() => setHelp((v) => !v)} aria-pressed={help} aria-label={`วิธีใช้ ${app.name}`} title="วิธีใช้" className={btn}>
            <CircleHelp size={17} />
          </button>
        )}
        <button type="button" onClick={() => onMinimize(win.id)} aria-label={`ย่อ ${app.name}`} className={btn}>
          <Minus size={18} />
        </button>
        {desktop && (
          <button type="button" onClick={() => onMaximize(win.id)} aria-label={maximized ? `ย่อขนาด ${app.name}` : `ขยาย ${app.name}`} className={btn}>
            {maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
        <button type="button" onClick={requestClose} aria-label={`ปิด ${app.name}`} className={btn}>
          <X size={18} />
        </button>
      </header>
      {help && tips && (
        <ul className="shrink-0 border-b-2 border-hairline bg-brand-soft px-4 py-2.5 flex flex-col gap-1 thai-font text-xs list-disc list-inside" aria-label={`วิธีใช้ ${app.name}`}>
          {tips.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 overflow-y-auto">
          <Suspense fallback={<p className="thai-font text-sm text-ink-soft p-6">กำลังเปิด...</p>}>
            <Component app={app} onOpenApp={onOpenApp} />
          </Suspense>
        </div>
        {!splashDone && <AppSplash app={app} onDone={() => setSplashDone(true)} />}
      </div>
    </div>
  )
}
