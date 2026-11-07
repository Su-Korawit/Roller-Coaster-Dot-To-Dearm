import { useMemo, useRef, useState } from 'react'
import { Lock, Palette } from 'lucide-react'
import Wallpaper from './Wallpaper'
import { useWallpaperDark } from './useWallpaperDark'
import AppIcon, { AppTile } from './AppIcon'
import AppDetailsSheet from './AppDetailsSheet'
import WallpaperSheet from './WallpaperSheet'
import AvatarSheet from './AvatarSheet'
import ProfileAvatar from './ProfileAvatar'
import { HELP_APP, HELP_BUTTON_ENABLED, findApp, homeAppIds, paginate } from './apps'
import { useDevice, useClock, formatTime, formatDate } from './hooks'
import { useOsStore } from '../stores/useOsStore'

const EMPTY_LONG_PRESS_MS = 550

export default function HomeScreen({ user, onOpenApp, onLock, windows = [], topId = null, onTaskbar = () => {} }) {
  const { device, cols, rows } = useDevice()
  const now = useClock()
  const dark = useWallpaperDark()
  const installed = useOsStore((s) => s.installed)
  const uninstallApp = useOsStore((s) => s.uninstallApp)
  const [page, setPage] = useState(0)
  const [details, setDetails] = useState(null)
  const [pickWallpaper, setPickWallpaper] = useState(false)
  const [pickAvatar, setPickAvatar] = useState(false)
  const scroller = useRef(null)
  const pressTimer = useRef(null)
  const pressStart = useRef(null)

  const pages = useMemo(
    () => paginate(homeAppIds(installed).map((id) => findApp(id)).filter(Boolean), cols * rows),
    [installed, cols, rows],
  )
  const desktop = device === 'desktop'

  function onScroll(e) {
    const el = e.currentTarget
    setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
  }

  function goToPage(i) {
    scroller.current?.scrollTo({ left: i * scroller.current.clientWidth, behavior: 'smooth' })
  }

  // Long-press on empty wallpaper (not on an icon) → wallpaper picker.
  function cancelPress() { clearTimeout(pressTimer.current); pressTimer.current = null }
  function onBgPointerDown(e) {
    if (e.target.closest('[data-os-icon], button')) return
    pressStart.current = { x: e.clientX, y: e.clientY }
    cancelPress()
    pressTimer.current = setTimeout(() => setPickWallpaper(true), EMPTY_LONG_PRESS_MS)
  }
  function onBgPointerMove(e) {
    if (!pressTimer.current || !pressStart.current) return
    if (Math.hypot(e.clientX - pressStart.current.x, e.clientY - pressStart.current.y) > 8) cancelPress()
  }
  function onBgContextMenu(e) {
    e.preventDefault()
    if (!e.target.closest('[data-os-icon]')) setPickWallpaper(true)
  }

  const barBtn = 'w-8 h-8 flex items-center justify-center rounded-ui hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
  const statusBar = (
    <div
      className={`absolute left-0 right-0 z-10 flex items-center gap-2 px-4 os-no-select ${desktop ? 'bottom-0 h-12 border-t-2 border-line/30 bg-paper/50 backdrop-blur-sm' : 'top-0 h-11'}`}
    >
      <button
        type="button"
        onClick={() => setPickAvatar(true)}
        aria-label="เปลี่ยนรูปโปรไฟล์"
        title="เปลี่ยนรูปโปรไฟล์"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ProfileAvatar user={user} size={30} />
      </button>
      <p className="thai-font text-xs opacity-80 hidden sm:block">{formatDate(now)}</p>
      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto os-pages" aria-label="แอปที่เปิดอยู่" role="toolbar">
        {windows.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onTaskbar(w.id)}
            aria-label={`${w.app.name}${w.minimized ? ' (ย่ออยู่)' : ''}`}
            aria-pressed={w.id === topId}
            title={w.app.name}
            className={`shrink-0 flex items-center gap-1.5 h-9 px-1.5 rounded-ui border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${w.id === topId ? 'bg-paper/80 border-line' : 'border-transparent hover:bg-white/30'} ${w.minimized ? 'opacity-70' : ''}`}
          >
            <AppTile app={w.app} size={24} />
            <span className="thai-font text-xs font-semibold hidden md:block max-w-[96px] truncate text-ink">{w.app.name}</span>
          </button>
        ))}
      </div>
      <button type="button" className={barBtn} onClick={() => setPickWallpaper(true)} aria-label="เปลี่ยนวอลเปเปอร์">
        <Palette size={16} />
      </button>
      <button type="button" className={barBtn} onClick={onLock} aria-label="ล็อกหน้าจอ">
        <Lock size={16} />
      </button>
      <time className="font-display font-semibold text-sm tabular-nums" dateTime={now.toISOString()}>{formatTime(now)}</time>
    </div>
  )

  return (
    <Wallpaper>
      {statusBar}

      <div
        className={`absolute inset-x-0 flex flex-col ${desktop ? 'top-0 bottom-12' : 'top-11 bottom-0'}`}
        onPointerDown={onBgPointerDown}
        onPointerMove={onBgPointerMove}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={onBgContextMenu}
      >
        <div ref={scroller} onScroll={onScroll} className="os-pages flex flex-1 overflow-x-auto snap-x snap-mandatory">
          {pages.map((items, i) => (
            <div key={i} className="w-full shrink-0 snap-start px-5 pt-6 sm:px-10 lg:px-16">
              <div
                className="grid gap-x-2 gap-y-5 justify-items-center content-start"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {items.map((app) => (
                  <AppIcon key={app.id} app={app} dark={dark} onOpen={onOpenApp} onLongPress={setDetails} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2 mx-auto mb-3 px-3 h-6 items-center rounded-full bg-ink/25" role="tablist" aria-label="หน้าจอ">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={page === i}
              aria-label={`หน้า ${i + 1}`}
              onClick={() => goToPage(i)}
              className={`h-2.5 rounded-full transition-all ${page === i ? 'w-6' : 'w-2.5 opacity-50'} ${dark ? 'bg-white' : 'bg-brand-strong'}`}
            />
          ))}
        </div>
      </div>

      {/* "พี่ช่วยเหลือ" — floating dark button, bottom-right (sketch). Hidden until HELP_BUTTON_ENABLED. */}
      {HELP_BUTTON_ENABLED && (
      <button
        type="button"
        onClick={() => onOpenApp(HELP_APP)}
        aria-label={HELP_APP.name}
        title={HELP_APP.name}
        className={`absolute right-4 z-10 w-14 h-14 rounded-ui bg-ink border-2 border-line shadow-px flex items-center justify-center
          active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
          ${desktop ? 'bottom-16' : 'bottom-12'}`}
      >
        <img src="/assets/voice/pijaidee-smile.png" alt="" width={36} height={36} draggable={false} style={{ imageRendering: 'pixelated' }} />
      </button>
      )}

      {details && (
        <AppDetailsSheet
          app={details}
          onOpen={onOpenApp}
          onUninstall={(app) => uninstallApp(app.id)}
          onClose={() => setDetails(null)}
        />
      )}
      {pickAvatar && <AvatarSheet user={user} onClose={() => setPickAvatar(false)} />}
      {pickWallpaper && <WallpaperSheet onClose={() => setPickWallpaper(false)} />}
    </Wallpaper>
  )
}
