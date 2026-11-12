import { useRef, useState } from 'react'
import { Check, ImagePlus, Film } from 'lucide-react'
import CropSheet from './CropSheet'
import { WALLPAPER_CATEGORIES, wallpapersIn, getWallpaper, wallpaperImage } from './wallpapers'
import { useOsStore, CUSTOM_WALLPAPER } from '../stores/useOsStore'
import { useCustomWallpaperUrl } from './useCustomWallpaperUrl'
import { cropImgStyle, prepareImage, saveWallpaperBlob, deleteWallpaperBlob } from './customWallpaper'

const MAX_FILE_MB = 30
const MINE = 'mine'

// Wallpaper chooser shared by the Home sheet and Settings: collections as tabs (like a phone's
// wallpaper gallery), a grid that adds columns as the screen gets wider, and "my photo" last.
export default function WallpaperPicker({ maxHeight = '55vh' }) {
  const current = useOsStore((s) => s.wallpaperId)
  const hasPhoto = useOsStore((s) => s.customAspect != null)
  const crop = useOsStore((s) => s.customCrop)
  const setWallpaper = useOsStore((s) => s.setWallpaper)
  const setCustomWallpaper = useOsStore((s) => s.setCustomWallpaper)
  const clearCustomWallpaper = useOsStore((s) => s.clearCustomWallpaper)
  const photoUrl = useCustomWallpaperUrl(hasPhoto)
  const fileInput = useRef(null)
  const [tab, setTab] = useState(() => (current === CUSTOM_WALLPAPER ? MINE : getWallpaper(current).category))
  const [cropping, setCropping] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''   // let the same file be picked again later
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) { setError('กรุณาเลือกไฟล์รูปภาพ'); return }
    if (file.size > MAX_FILE_MB * 1024 * 1024) { setError(`ไฟล์ใหญ่เกิน ${MAX_FILE_MB} MB`); return }
    setBusy(true)
    try {
      const { blob, aspect, dark } = await prepareImage(file)
      await saveWallpaperBlob(blob)
      setCustomWallpaper({ aspect, dark })
      setCropping(true)
    } catch (err) {
      console.error('[os] saving wallpaper failed:', err)
      setError('เปิดรูปนี้ไม่ได้ ลองรูปอื่น')
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto() {
    try { await deleteWallpaperBlob() } catch (err) { console.error('[os] deleting wallpaper failed:', err) }
    clearCustomWallpaper()
  }

  const swatch = 'relative w-full aspect-[3/4] rounded-ui border-2 overflow-hidden'
  const ring = (on) => (on ? 'border-brand-strong shadow-px-sm' : 'border-hairline')
  const actionBtn = 'px-btn px-3 py-2 thai-font text-xs font-bold bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50'
  const tabBtn = (on) => `shrink-0 px-btn px-3 py-1.5 thai-font text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${on ? 'bg-brand-strong text-white' : 'bg-paper'}`
  const grid = 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto p-1'

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2" role="tablist" aria-label="หมวดวอลเปเปอร์">
        {WALLPAPER_CATEGORIES.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={tab === c.id} onClick={() => setTab(c.id)} className={tabBtn(tab === c.id)}>{c.name}</button>
        ))}
        <button type="button" role="tab" aria-selected={tab === MINE} onClick={() => setTab(MINE)} className={tabBtn(tab === MINE)}>รูปของฉัน</button>
      </div>

      {tab !== MINE && (
        <div className={grid} style={{ maxHeight }} role="radiogroup" aria-label="วอลเปเปอร์">
          {wallpapersIn(tab).map((w) => (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={current === w.id}
              onClick={() => setWallpaper(w.id)}
              className="flex flex-col items-center gap-1.5 focus-visible:outline-none"
            >
              <span
                className={`${swatch} ${ring(current === w.id)}`}
                style={{ background: `url(${wallpaperImage(w.id, 'portrait')}) center bottom / cover, ${w.css}`, imageRendering: 'pixelated' }}
              >
                {w.video && <Film size={14} className={`absolute bottom-1.5 left-1.5 ${w.dark ? 'text-white' : 'text-brand-strong'}`} aria-label="มีวิดีโอเคลื่อนไหว" />}
                {current === w.id && (
                  <Check size={18} className={`absolute top-1.5 right-1.5 ${w.dark ? 'text-white' : 'text-brand-strong'}`} />
                )}
              </span>
              <span className="thai-font text-xs text-center leading-tight">{w.name}</span>
            </button>
          ))}
        </div>
      )}

      {tab === MINE && (
        <>
          <div className={grid} style={{ maxHeight }} role="radiogroup" aria-label="รูปของฉัน">
            {hasPhoto ? (
              <button
                type="button"
                role="radio"
                aria-checked={current === CUSTOM_WALLPAPER}
                onClick={() => setWallpaper(CUSTOM_WALLPAPER)}
                className="flex flex-col items-center gap-1.5 focus-visible:outline-none"
              >
                <span className={`${swatch} ${ring(current === CUSTOM_WALLPAPER)} bg-mist`}>
                  {photoUrl && <img src={photoUrl} alt="" draggable={false} className="w-full h-full" style={cropImgStyle(crop)} />}
                  {current === CUSTOM_WALLPAPER && <Check size={18} className="absolute top-1.5 right-1.5 text-white drop-shadow" />}
                </span>
                <span className="thai-font text-xs">รูปของฉัน</span>
              </button>
            ) : (
              <p className="thai-font text-xs text-ink-soft col-span-full">ยังไม่มีรูปของคุณ เพิ่มรูปจากเครื่องได้เลย</p>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" onChange={onPick} className="sr-only" aria-label="เลือกรูปจากเครื่อง" tabIndex={-1} />
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className={`${actionBtn} flex items-center gap-1.5`}>
              <ImagePlus size={14} aria-hidden="true" />
              {busy ? 'กำลังเปิดรูป...' : hasPhoto ? 'เปลี่ยนรูปของฉัน' : 'เพิ่มรูปจากเครื่อง'}
            </button>
            {hasPhoto && (
              <>
                <button type="button" onClick={() => { setWallpaper(CUSTOM_WALLPAPER); setCropping(true) }} className={actionBtn}>จัดตำแหน่ง/ครอป</button>
                <button type="button" onClick={removePhoto} className={`${actionBtn} text-danger`}>ลบรูป</button>
              </>
            )}
          </div>
          <p className="thai-font text-xs text-ink-soft mt-2">รูปเก็บไว้ในเครื่องนี้เท่านั้น ไม่ถูกอัปโหลด</p>
        </>
      )}
      {error && <p className="thai-font text-xs text-danger mt-2" role="alert">{error}</p>}
      {cropping && <CropSheet onClose={() => setCropping(false)} />}
    </div>
  )
}
