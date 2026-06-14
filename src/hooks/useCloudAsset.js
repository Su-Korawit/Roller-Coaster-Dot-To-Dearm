import { useEffect, useState } from 'react'
import { cloudAsset } from '../utils/cloudAsset'

// Resolves a Storage path to a download URL for use in React. Starts at
// `fallback` and swaps to the cloud URL once resolved; on error the resolver
// returns `fallback`, so the returned value is always usable.
export function useCloudAsset(path, fallback = null) {
  const [url, setUrl] = useState(fallback)

  useEffect(() => {
    if (!path) return
    let alive = true
    cloudAsset(path, { fallback }).then((u) => {
      if (alive) setUrl(u ?? fallback)
    })
    return () => {
      alive = false
    }
  }, [path, fallback])

  return url
}
