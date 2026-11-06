import { useState } from 'react'
import { getWallpaper, wallpaperImage } from './wallpapers'
import { useOsStore } from '../stores/useOsStore'
import './os.css'

// Full-screen wallpaper shell shared by every OS screen. The gradient is the fallback; the
// pixel-art image (portrait on tall screens, landscape on wide ones) covers it once loaded.
// `dark` wallpapers switch text to light.
export default function Wallpaper({ children, className = '', scroll = false }) {
  const wallpaperId = useOsStore((s) => s.wallpaperId)
  const wp = getWallpaper(wallpaperId)
  const [failed, setFailed] = useState({})
  const showImage = !failed[wp.id]
  return (
    <div
      className={`relative h-dvh w-full ${scroll ? 'overflow-y-auto' : 'overflow-hidden'} ${wp.dark ? 'text-white' : 'text-ink'} ${className}`}
      style={{ background: wp.css }}
    >
      {showImage && (
        <picture className="fixed inset-0 pointer-events-none" aria-hidden="true">
          <source media="(orientation: portrait)" srcSet={wallpaperImage(wp.id, 'portrait')} />
          <img
            src={wallpaperImage(wp.id, 'landscape')}
            alt=""
            draggable={false}
            onError={() => setFailed((f) => ({ ...f, [wp.id]: true }))}
            className="w-full h-full object-cover object-bottom"
            style={{ imageRendering: 'pixelated' }}
          />
        </picture>
      )}
      {children}
    </div>
  )
}
