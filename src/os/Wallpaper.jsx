import { useEffect, useState } from 'react'
import { DEFAULT_WALLPAPER, getWallpaper, wallpaperImage, wallpaperVideo } from './wallpapers'
import { useOsStore, CUSTOM_WALLPAPER } from '../stores/useOsStore'
import { useCustomWallpaperUrl } from './useCustomWallpaperUrl'
import { cropImgStyle } from './customWallpaper'
import './os.css'

const mq = (q) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null)

function useMediaMatch(query) {
  const [on, setOn] = useState(() => !!mq(query)?.matches)
  useEffect(() => {
    const m = mq(query)
    if (!m) return undefined
    const update = () => setOn(m.matches)
    update()
    m.addEventListener?.('change', update)
    return () => m.removeEventListener?.('change', update)
  }, [query])
  return on
}

// The clip is only worth the data when the person has not asked for less motion or less data.
function videoAllowed() {
  if (mq('(prefers-reduced-motion: reduce)')?.matches) return false
  return !(typeof navigator !== 'undefined' && navigator.connection?.saveData)
}

// Loads quietly behind the still image; fades in once it can play through, and is dropped on any error.
function WallpaperVideo({ src }) {
  const [state, setState] = useState({ src, ready: false, failed: false })
  const cur = state.src === src ? state : { src, ready: false, failed: false }
  if (cur.failed) return null
  return (
    <video
      key={src}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onCanPlayThrough={() => setState({ src, ready: true, failed: false })}
      onError={() => setState({ src, ready: false, failed: true })}
      className="absolute inset-0 w-full h-full object-cover object-bottom transition-opacity duration-700"
      style={{ opacity: cur.ready ? 1 : 0, imageRendering: 'pixelated' }}
    />
  )
}

// Full-screen wallpaper shell shared by every OS screen. The gradient is the fallback; the
// pixel-art image (portrait on tall screens, landscape on wide ones) — or the user's own photo,
// framed by their crop — covers it once loaded; a looping clip, when the wallpaper has one, loads
// behind the image and takes over once it can play through. `dark` wallpapers switch text to light.
export default function Wallpaper({ children, className = '', scroll = false }) {
  const wallpaperId = useOsStore((s) => s.wallpaperId)
  const customAspect = useOsStore((s) => s.customAspect)
  const customDark = useOsStore((s) => s.customDark)
  const customCrop = useOsStore((s) => s.customCrop)
  const [failed, setFailed] = useState({})
  const portrait = useMediaMatch('(orientation: portrait)')

  const custom = wallpaperId === CUSTOM_WALLPAPER && customAspect != null
  const customUrl = useCustomWallpaperUrl(custom)
  const wp = custom ? { id: CUSTOM_WALLPAPER, dark: customDark, css: getWallpaper(DEFAULT_WALLPAPER).css } : getWallpaper(wallpaperId)
  const showPreset = !custom && !failed[wp.id]
  const showVideo = showPreset && wp.video && videoAllowed()

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
      {showVideo && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <WallpaperVideo src={wallpaperVideo(wp.id, portrait ? 'portrait' : 'landscape')} />
        </div>
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
