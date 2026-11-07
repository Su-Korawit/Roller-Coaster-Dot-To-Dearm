import { Suspense, useEffect, useRef, useState } from 'react'
import { X, Minus, Maximize2, Minimize2, CircleHelp } from 'lucide-react'
import { Z_PANEL } from '../constants/zIndex'
import AppSplash from './splash/AppSplash'
import { AppTile } from './AppIcon'
import { hasSplash } from './splash/splashLogic'
import { TASKBAR_H, centredPos, clampPos, windowSize } from './windowsLogic'
import { APP_HELP } from './guideContent'

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
export default function AppWindow({ win, index, isTop, desktop, onClose, onMinimize, onMaximize, onFocus, onMove, onOpenApp }) {
  const { app, minimized, maximized, pos } = win
  const { Icon, Component } = app
  const { vw, vh } = useViewport()
  const drag = useRef(null)
  const [splashDone, setSplashDone] = useState(() => !hasSplash(app))
  const [help, setHelp] = useState(false)
  const tips = APP_HELP[app.id]

  useEffect(() => {
    if (!isTop) return undefined
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isTop, onClose])

  const size = windowSize(vw, vh)
  const at = clampPos(pos ?? centredPos(vw, vh), size, vw, vh)
  const full = !desktop || maximized

  const style = { zIndex: Z_PANEL + index, display: minimized ? 'none' : undefined }
  if (desktop) {
    Object.assign(style, maximized
      ? { left: 0, top: 0, width: '100vw', height: `calc(100vh - ${TASKBAR_H}px)` }
      : { left: at.x, top: at.y, width: size.w, height: size.h })
  }

  function onDown(e) {
    if (!desktop || maximized || e.button !== 0 || e.target.closest('button')) return
    drag.current = { dx: e.clientX - at.x, dy: e.clientY - at.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onDrag(e) {
    if (!drag.current) return
    onMove(win.id, clampPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }, size, vw, vh))
  }
  function onUp(e) {
    drag.current = null
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const btn = 'w-8 h-8 flex items-center justify-center rounded-ui hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
  return (
    <div
      role="dialog"
      aria-label={app.name}
      onPointerDownCapture={() => { if (!isTop) onFocus(win.id) }}
      className={`px-card bg-paper text-ink flex flex-col fixed animate-pop ${full ? 'rounded-none border-0' : 'rounded-[var(--radius-ui)] border-2'} ${desktop ? '' : 'inset-0'}`}
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
        {(app.logo || Icon) && <AppTile app={app} size={30} />}
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="thai-font font-bold text-sm truncate">{app.name}</h2>
          {app.tagline && <p className="thai-font text-xs text-ink-soft truncate hidden sm:block">{app.tagline}</p>}
        </div>
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
        <button type="button" onClick={() => onClose(win.id)} aria-label={`ปิด ${app.name}`} className={btn}>
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
