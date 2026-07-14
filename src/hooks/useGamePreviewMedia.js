import { useEffect, useState } from 'react'
import { getDoc } from 'firebase/firestore'
import { refs } from '../lib/db'

const EMPTY = { mediaUrl: null, mediaType: null, loading: true }

// One-time read of welcomeConfig/gamePreview for Hub (and similar) surfaces.
// Narrower than useWelcomeContent — Hub only needs the media doc.
export function useGamePreviewMedia() {
  const [state, setState] = useState(EMPTY)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const snap = await getDoc(refs.welcomeGamePreview())
      if (!alive) return
      if (!snap.exists()) {
        setState({ mediaUrl: null, mediaType: null, loading: false })
        return
      }
      const data = snap.data()
      setState({
        mediaUrl: data.mediaUrl ?? null,
        mediaType: data.mediaType ?? null,
        loading: false,
      })
    })().catch(() => {
      if (alive) setState({ mediaUrl: null, mediaType: null, loading: false })
    })
    return () => { alive = false }
  }, [])

  return state
}
