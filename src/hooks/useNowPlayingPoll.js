// src/hooks/useNowPlayingPoll.js
import { useEffect } from 'react'
import { withFreshToken } from './useSpotifyToken'
import { getPlaybackState } from '../services/spotifyApi'
import { useMusicStore } from '../stores/useMusicStore'

const POLL_MS = 5000

export function useNowPlayingPoll() {
  const status = useMusicStore((s) => s.status)

  useEffect(() => {
    if (status !== 'connected') return
    let stopped = false

    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const state = await withFreshToken((token) => getPlaybackState(token))
        if (!stopped) useMusicStore.getState().applyPlayback(state)
      } catch (e) {
        if (!stopped) useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN')
      }
    }

    tick()
    const id = setInterval(tick, POLL_MS)
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVis)

    return () => { stopped = true; clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [status])
}
