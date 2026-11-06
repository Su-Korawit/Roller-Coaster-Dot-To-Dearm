import { useEffect, useState } from 'react'
import { loadWallpaperBlob } from './customWallpaper'
import { useOsStore } from '../stores/useOsStore'

// Object URL of the user's saved photo (null while loading, when there is none, or if storage
// is unavailable). Reloads when `customRev` changes; the URL is revoked on cleanup.
export function useCustomWallpaperUrl(enabled = true) {
  const rev = useOsStore((s) => s.customRev)
  const hasPhoto = useOsStore((s) => s.customAspect != null)
  const [state, setState] = useState({ rev: -1, url: null })

  useEffect(() => {
    if (!enabled || !hasPhoto) return undefined
    let cancelled = false
    let objectUrl = null
    loadWallpaperBlob()
      .then((blob) => {
        if (cancelled || !blob) return
        objectUrl = URL.createObjectURL(blob)
        setState({ rev, url: objectUrl })
      })
      .catch((e) => console.error('[os] reading wallpaper failed:', e))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [enabled, hasPhoto, rev])

  return enabled && hasPhoto && state.rev === rev ? state.url : null
}
