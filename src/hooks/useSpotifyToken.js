// Ensures a non-expired Spotify access token, refreshing via the Firestore
// refresh token when needed, and retrying a call once after a 401. Plain module
// functions (not a React hook) so services + components share one code path.
import { getDoc } from 'firebase/firestore'
import { refs } from '../lib/db'
import { refreshAccessToken } from '../lib/spotifyAuth'
import { useMusicStore } from '../stores/useMusicStore'
import { useAuthStore } from '../stores/useAuthStore'

const SKEW_MS = 60_000

async function loadRefreshToken() {
  const uid = useAuthStore.getState().user?.uid
  if (!uid) throw new Error('not signed in')
  const snap = await getDoc(refs.spotifyAuth(uid))
  if (!snap.exists()) throw new Error('no spotify connection')
  return snap.data().refreshToken
}

async function doRefresh() {
  const rt = await loadRefreshToken()
  const { accessToken, expiresIn } = await refreshAccessToken(rt)
  const expiresAt = Date.now() + expiresIn * 1000
  useMusicStore.getState().setTokens({ accessToken, expiresAt })
  return accessToken
}

export async function ensureFreshToken() {
  const { accessToken, expiresAt } = useMusicStore.getState()
  if (accessToken && expiresAt && expiresAt - Date.now() > SKEW_MS) return accessToken
  return doRefresh()
}

export async function withFreshToken(fn) {
  const token = await ensureFreshToken()
  try {
    return await fn(token)
  } catch (e) {
    if (e?.reason === 'UNAUTHORIZED') {
      const fresh = await doRefresh()
      return fn(fresh)
    }
    throw e
  }
}
