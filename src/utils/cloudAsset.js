import { ref, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

// Resolves a Storage path to a download URL. Two cache tiers:
//   1. in-memory Promise map — concurrent callers share one round-trip
//   2. localStorage (`rc-asset-url:<path>`, 24 h TTL) — survives reloads so a
//      refresh doesn't re-run getDownloadURL for every asset before the game
//      can render. Display-asset URLs only (ADR-0003) — never game state
//      (ADR-0004).
// On any error (offline, missing object, rules) resolves to `fallback`;
// fallbacks are never persisted.
const urlCache = new Map() // path -> Promise<string|null>
const STORE_PREFIX = 'rc-asset-url:'
const TTL_MS = 24 * 60 * 60 * 1000

function readPersisted(path) {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + path)
    if (!raw) return null
    const { url, ts } = JSON.parse(raw)
    return url && Date.now() - ts <= TTL_MS ? url : null
  } catch {
    return null
  }
}

function writePersisted(path, url) {
  try {
    localStorage.setItem(STORE_PREFIX + path, JSON.stringify({ url, ts: Date.now() }))
  } catch {
    /* quota full / private mode — the in-memory tier still works */
  }
}

export function cloudAsset(path, { fallback = null } = {}) {
  if (!urlCache.has(path)) {
    const persisted = readPersisted(path)
    urlCache.set(
      path,
      persisted
        ? Promise.resolve(persisted)
        : getDownloadURL(ref(storage, path))
            .then((url) => {
              writePersisted(path, url)
              return url
            })
            .catch((err) => {
              console.warn('[cloudAsset] falling back for', path, err?.code || err)
              return fallback
            }),
    )
  }
  return urlCache.get(path)
}

// Drop a cached URL (both tiers) so the next cloudAsset() re-fetches — used
// after an admin replaces an asset in Storage. Other clients' persisted
// entries age out within the TTL.
export function bustCache(path) {
  urlCache.delete(path)
  try {
    localStorage.removeItem(STORE_PREFIX + path)
  } catch {
    /* ignore */
  }
}
