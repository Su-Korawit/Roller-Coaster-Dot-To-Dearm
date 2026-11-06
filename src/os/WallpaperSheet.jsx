import { Check } from 'lucide-react'
import OsSheet from './OsSheet'
import { WALLPAPERS, wallpaperImage } from './wallpapers'
import { useOsStore } from '../stores/useOsStore'

export default function WallpaperSheet({ onClose }) {
  const current = useOsStore((s) => s.wallpaperId)
  const setWallpaper = useOsStore((s) => s.setWallpaper)
  return (
    <OsSheet title="เปลี่ยนวอลเปเปอร์" onClose={onClose}>
      <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="วอลเปเปอร์">
        {WALLPAPERS.map((w) => (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={current === w.id}
            onClick={() => setWallpaper(w.id)}
            className="flex flex-col items-center gap-1.5 focus-visible:outline-none"
          >
            <span
              className={`relative w-full aspect-[3/4] rounded-ui border-2 ${current === w.id ? 'border-brand-strong shadow-px-sm' : 'border-hairline'}`}
              style={{ background: `url(${wallpaperImage(w.id, 'portrait')}) center bottom / cover, ${w.css}`, imageRendering: 'pixelated' }}
            >
              {current === w.id && (
                <Check size={18} className={`absolute top-1.5 right-1.5 ${w.dark ? 'text-white' : 'text-brand-strong'}`} />
              )}
            </span>
            <span className="thai-font text-xs">{w.name}</span>
          </button>
        ))}
      </div>
    </OsSheet>
  )
}
