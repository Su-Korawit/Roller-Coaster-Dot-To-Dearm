import { getWallpaper } from './wallpapers'
import { useOsStore } from '../stores/useOsStore'

// True when the current wallpaper is dark, so screens switch to light text.
export function useWallpaperDark() {
  return getWallpaper(useOsStore((s) => s.wallpaperId)).dark
}
