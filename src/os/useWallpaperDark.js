import { getWallpaper } from './wallpapers'
import { useOsStore, CUSTOM_WALLPAPER } from '../stores/useOsStore'

// True when the current wallpaper is dark, so screens switch to light text.
export function useWallpaperDark() {
  return useOsStore((s) => (
    s.wallpaperId === CUSTOM_WALLPAPER && s.customAspect != null ? s.customDark : getWallpaper(s.wallpaperId).dark
  ))
}
