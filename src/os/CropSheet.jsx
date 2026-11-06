import { useRef, useState } from 'react'
import OsSheet from './OsSheet'
import { useOsStore } from '../stores/useOsStore'
import { useCustomWallpaperUrl } from './useCustomWallpaperUrl'
import { cropImgStyle, dragToFocus, MAX_ZOOM } from './customWallpaper'

const BOX_W = 300
const BOX_H = 360

// Position + zoom the user's photo. The frame has the same shape as this screen, so what you see
// is what the wallpaper looks like here (other screen shapes follow the same focus point).
export default function CropSheet({ onClose }) {
  const aspect = useOsStore((s) => s.customAspect) ?? 1
  const saved = useOsStore((s) => s.customCrop)
  const setCustomCrop = useOsStore((s) => s.setCustomCrop)
  const url = useCustomWallpaperUrl(true)
  const [crop, setCrop] = useState(saved)
  const [frame] = useState(() => {
    const screen = window.innerWidth / Math.max(1, window.innerHeight)
    const w = screen >= BOX_W / BOX_H ? BOX_W : Math.round(BOX_H * screen)
    return { w, h: Math.round(w / screen) }
  })
  const drag = useRef(null)

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY }
  }
  function onPointerMove(e) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    drag.current = { x: e.clientX, y: e.clientY }
    setCrop((c) => dragToFocus(c, dx, dy, frame, aspect))
  }
  function endDrag() { drag.current = null }

  function save() {
    setCustomCrop(crop)
    onClose()
  }

  return (
    <OsSheet title="จัดตำแหน่งรูป" onClose={onClose}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative overflow-hidden rounded-ui border-2 border-line bg-mist cursor-grab active:cursor-grabbing touch-none"
          style={{ width: frame.w, height: frame.h }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="img"
          aria-label="ลากรูปเพื่อเลือกส่วนที่จะแสดง"
        >
          {url && <img src={url} alt="" draggable={false} className="w-full h-full select-none" style={cropImgStyle(crop)} />}
          {/* rule-of-thirds guide */}
          <span className="absolute inset-0 pointer-events-none opacity-40"
            style={{ backgroundImage: 'linear-gradient(to right, transparent 33%, #fff 33%, #fff calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, #fff 66%, #fff calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(to bottom, transparent 33%, #fff 33%, #fff calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, #fff 66%, #fff calc(66% + 1px), transparent calc(66% + 1px))' }}
            aria-hidden="true" />
        </div>
        <p className="thai-font text-xs text-ink-soft">ลากรูปเพื่อเลื่อน และใช้แถบด้านล่างเพื่อซูม</p>
        <label className="w-full flex items-center gap-3 thai-font text-xs">
          <span>ซูม</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
            className="flex-1 accent-[var(--color-brand-strong)]"
            aria-label="ซูมรูป"
          />
        </label>
        <div className="flex gap-3 w-full">
          <button type="button" onClick={onClose}
            className="px-btn flex-1 py-2.5 thai-font text-sm font-bold bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            ยกเลิก
          </button>
          <button type="button" onClick={save}
            className="px-btn flex-1 py-2.5 thai-font text-sm font-bold bg-brand-strong text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            ใช้รูปนี้
          </button>
        </div>
      </div>
    </OsSheet>
  )
}
