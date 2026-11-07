import { useMemo, useRef, useState } from 'react'
import { Lock, Palette, FolderPlus, FileText, CircleHelp } from 'lucide-react'
import OsGuide from './OsGuide'
import Wallpaper from './Wallpaper'
import { useWallpaperDark } from './useWallpaperDark'
import AppIcon, { AppTile } from './AppIcon'
import AppDetailsSheet from './AppDetailsSheet'
import WallpaperSheet from './WallpaperSheet'
import AvatarSheet from './AvatarSheet'
import ProfileAvatar from './ProfileAvatar'
import { HELP_APP, HELP_BUTTON_ENABLED, OS_APPS, findApp, paginate } from './apps'
import { FolderTile, FolderSheet, FileSheet } from './HomeExtras'
import { layoutTokens, parseToken, acceptFiles } from './homeLayout'
import { saveHomeFile, newFileId, openHomeFile } from './homeFiles'
import { useDevice, useClock, useTouchPrimary, formatTime, formatDate } from './hooks'
import { useOsStore } from '../stores/useOsStore'

const EMPTY_LONG_PRESS_MS = 550

export default function HomeScreen({ user, onOpenApp, onLock, windows = [], topId = null, onTaskbar = () => {} }) {
  const { device, cols, rows } = useDevice()
  const now = useClock()
  const dark = useWallpaperDark()
  const installed = useOsStore((s) => s.installed)
  const order = useOsStore((s) => s.order)
  const folders = useOsStore((s) => s.folders)
  const files = useOsStore((s) => s.files)
  const guideSeen = useOsStore((s) => s.guideSeen)
  const uninstallApp = useOsStore((s) => s.uninstallApp)
  const dropToken = useOsStore((s) => s.dropToken)
  const touch = useTouchPrimary()
  const lastEdge = useRef(0)
  const [page, setPage] = useState(0)
  const [details, setDetails] = useState(null)
  const [pickWallpaper, setPickWallpaper] = useState(false)
  const [pickAvatar, setPickAvatar] = useState(false)
  const [menu, setMenu] = useState(null)             // { x, y } right-click menu on empty wallpaper
  const [openFolderId, setOpenFolderId] = useState(null)
  const [fileInfo, setFileInfo] = useState(null)
  const [notice, setNotice] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const scroller = useRef(null)
  const pressTimer = useRef(null)
  const pressStart = useRef(null)

  // Everything on Home, in the saved order: apps, folders and dropped files (see homeLayout).
  const entries = useMemo(() => layoutTokens({ order, installed, folders, files, apps: OS_APPS }).map((token) => {
    const p = parseToken(token)
    if (p.kind === 'app') { const app = findApp(p.id); return app ? { token, kind: 'app', app } : null }
    if (p.kind === 'folder') {
      const folder = folders.find((f) => f.id === p.id)
      return folder ? { token, kind: 'folder', folder, app: { id: token, name: folder.name } } : null
    }
    const file = files.find((f) => f.id === p.id)
    return file ? { token, kind: 'file', file, app: { id: token, name: file.name, Icon: FileText, tone: 'var(--color-zone-sci)' } } : null
  }).filter(Boolean), [order, installed, folders, files])
  const pages = useMemo(() => paginate(entries, cols * rows), [entries, cols, rows])
  const openFolder = folders.find((f) => f.id === openFolderId) ?? null
  const desktop = device === 'desktop'

  function onScroll(e) {
    const el = e.currentTarget
    setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
  }

  // Carrying an icon near the screen edge flips to the neighbouring page (at most every 700 ms).
  function onDragEdge(dir, now) {
    if (now - lastEdge.current < 700) return
    const next = Math.min(pages.length - 1, Math.max(0, page + dir))
    if (next === page) return
    lastEdge.current = now
    goToPage(next)
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
    if (!e.target.closest('[data-os-icon]')) setMenu({ x: e.clientX, y: e.clientY })
  }

  // Desktop: drop files from the computer onto Home. They are kept on this device only.
  function onFilesOver(e) {
    if (!touch && e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }
  }
  async function onFilesDrop(e) {
    if (!e.dataTransfer?.files?.length) return
    e.preventDefault()
    const { ok, rejected } = acceptFiles([...e.dataTransfer.files], files.length)
    for (const f of ok) {
      const id = newFileId()
      try {
        await saveHomeFile(id, f)
        useOsStore.getState().addFile({ id, name: f.name.slice(0, 80), size: f.size, type: f.type })
      } catch {
        rejected.push({ name: f.name, reason: 'บันทึกไม่ได้ (พื้นที่เก็บข้อมูลในเบราว์เซอร์ปิดอยู่หรือเต็ม)' })
      }
    }
    setNotice(rejected.length ? rejected.map((r) => `${r.name}: ${r.reason}`).join(' · ') : ok.length ? `เพิ่ม ${ok.length} ไฟล์ไว้บนหน้า Home แล้ว` : '')
    if (ok.length || rejected.length) setTimeout(() => setNotice(''), 6000)
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
      <button type="button" className={barBtn} onClick={() => setGuideOpen(true)} aria-label="คู่มือใช้งาน" title="คู่มือใช้งาน">
        <CircleHelp size={16} />
      </button>
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
        onDragOver={onFilesOver}
        onDrop={onFilesDrop}
      >
        <div ref={scroller} onScroll={onScroll} data-os-drop-area className="os-pages flex flex-1 overflow-x-auto snap-x snap-mandatory">
          {pages.map((items, i) => (
            <div key={i} className="w-full shrink-0 snap-start px-5 pt-6 sm:px-10 lg:px-16">
              <div
                className="grid gap-x-2 gap-y-5 justify-items-center content-start"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {items.map((it) => {
                  const common = { app: it.app, token: it.token, dark, draggable: true, touch, onDrop: dropToken, onEdge: onDragEdge, getScrollLeft: () => scroller.current?.scrollLeft ?? 0 }
                  if (it.kind === 'folder') {
                    return <AppIcon key={it.token} {...common} renderTile={() => <FolderTile folder={it.folder} />} onOpen={() => setOpenFolderId(it.folder.id)} onLongPress={() => setOpenFolderId(it.folder.id)} />
                  }
                  if (it.kind === 'file') {
                    return <AppIcon key={it.token} {...common} onOpen={() => openHomeFile(it.file)} onLongPress={() => setFileInfo(it.file)} />
                  }
                  return <AppIcon key={it.token} {...common} onOpen={onOpenApp} onLongPress={setDetails} />
                })}
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
      {(!guideSeen || guideOpen) && (
        <OsGuide onOpenApp={onOpenApp} onClose={() => { useOsStore.getState().markGuideSeen(); setGuideOpen(false) }} />
      )}
      {pickAvatar && <AvatarSheet user={user} onClose={() => setPickAvatar(false)} />}
      {openFolder && (
        <FolderSheet
          folder={openFolder}
          onOpenApp={onOpenApp}
          onRename={(id, name) => useOsStore.getState().renameFolder(id, name)}
          onTakeOut={(fid, aid) => useOsStore.getState().takeOutOfFolder(fid, aid)}
          onDelete={(id) => useOsStore.getState().deleteFolder(id)}
          onClose={() => setOpenFolderId(null)}
        />
      )}
      {fileInfo && <FileSheet file={fileInfo} onOpen={openHomeFile} onRemove={(id) => useOsStore.getState().removeFile(id)} onClose={() => setFileInfo(null)} />}
      {notice && <p role="status" className="absolute left-1/2 -translate-x-1/2 bottom-16 z-20 max-w-[90%] px-card px-4 py-2 bg-paper text-ink thai-font text-sm">{notice}</p>}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onPointerDown={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null) }} aria-hidden="true" />
          <div role="menu" className="fixed z-50 px-card bg-paper text-ink p-1 flex flex-col min-w-[190px]" style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 110) }}>
            <button type="button" role="menuitem" onClick={() => { useOsStore.getState().newFolder(); setMenu(null) }} className="flex items-center gap-2 px-3 py-2 rounded-ui hover:bg-brand-soft thai-font text-sm text-left"><FolderPlus size={16} aria-hidden="true" /> สร้างโฟลเดอร์ใหม่</button>
            <button type="button" role="menuitem" onClick={() => { setPickWallpaper(true); setMenu(null) }} className="flex items-center gap-2 px-3 py-2 rounded-ui hover:bg-brand-soft thai-font text-sm text-left"><Palette size={16} aria-hidden="true" /> เปลี่ยนวอลเปเปอร์</button>
          </div>
        </>
      )}
      {pickWallpaper && <WallpaperSheet onClose={() => setPickWallpaper(false)} />}
    </Wallpaper>
  )
}
