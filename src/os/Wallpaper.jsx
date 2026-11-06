import { useState } from 'react'
import { DEFAULT_WALLPAPER, getWallpaper, wallpaperImage } from './wallpapers'
import { useOsStore, CUSTOM_WALLPAPER } from '../stores/useOsStore'
import { useCustomWallpaperUrl } from './useCustomWallpaperUrl'
import { cropImgStyle } from './customWallpaper'
import './os.css'

// Full-screen wallpaper shell shared by every OS screen. The gradient is the fallback; the
// pixel-art image (portrait on tall screens, landscape on wide ones) — or the user's own photo,
// framed by their crop — covers it once loaded. `dark` wallpapers switch text to light.
export default function Wallpaper({ children, className = '', scroll = false }) {
  const wallpaperId = useOsStore((s) => s.wallpaperId)
  const customAspect = useOsStore((s) => s.customAspect)
  const customDark = useOsStore((s) => s.customDark)
  const customCrop = useOsStore((s) => s.customCrop)
  const [failed, setFailed] = useState({})

  const custom = wallpaperId === CUSTOM_WALLPAPER && customAspect != null
  const customUrl = useCustomWallpaperUrl(custom)
  const wp = custom ? { id: CUSTOM_WALLPAPER, dark: customDark, css: getWallpaper(DEFAULT_WALLPAPER).css } : getWallpaper(wallpaperId)
  const showPreset = !custom && !failed[wp.id]

  return (
    <div
      className={`relative h-dvh w-full ${scroll ? 'overflow-y-auto' : 'overflow-hidden'} ${wp.dark ? 'text-white' : 'text-ink'} ${className}`}
      style={{ background: wp.css }}
    >
      {showPreset && (
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
      {custom && customUrl && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <img src={customUrl} alt="" draggable={false} className="w-full h-full" style={cropImgStyle(customCrop)} />
        </div>
      )}
      {children}
    </div>
  )
}
