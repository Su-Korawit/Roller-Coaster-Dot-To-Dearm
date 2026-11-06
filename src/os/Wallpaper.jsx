import { getWallpaper } from './wallpapers'
import { useOsStore } from '../stores/useOsStore'
import './os.css'

// Full-screen wallpaper shell shared by every OS screen. `dark` wallpapers switch text to light.
export default function Wallpaper({ children, className = '', scroll = false }) {
  const wallpaperId = useOsStore((s) => s.wallpaperId)
  const wp = getWallpaper(wallpaperId)
  return (
    <div
      className={`relative h-dvh w-full ${scroll ? 'overflow-y-auto' : 'overflow-hidden'} ${wp.dark ? 'text-white' : 'text-ink'} ${className}`}
      style={{ background: wp.css }}
    >
      <div className="pixel-checker absolute inset-0 pointer-events-none" aria-hidden="true" />
      {children}
    </div>
  )
}
