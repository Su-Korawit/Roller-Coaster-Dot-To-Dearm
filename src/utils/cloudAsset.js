import { ref, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

// Resolves a Storage path to a download URL, cached per session. On any error
// (offline, missing object, rules) it resolves to `fallback` so callers never
// break. The cache holds the Promise itself, so concurrent callers for the same
// path share one network round-trip.
const urlCache = new Map() // path -> Promise<string|null>

export function cloudAsset(path, { fallback = null } = {}) {
  if (!urlCache.has(path)) {
    urlCache.set(
      path,
      getDownloadURL(ref(storage, path)).catch((err) => {
        console.warn('[cloudAsset] falling back for', path, err?.code || err)
        return fallback
      }),
    )
  }
  return urlCache.get(path)
}

// Drop a cached URL so the next cloudAsset() re-fetches — used after an admin
// replaces an asset in Storage.
export function bustCache(path) {
  urlCache.delete(path)
}
