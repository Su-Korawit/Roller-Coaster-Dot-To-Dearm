// Orchestrates the connect / restore / disconnect lifecycle around the Firestore
// refresh token. See docs/adr/0010.
import { getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { refs, shapes } from '../lib/db'
import {
  generateCodeVerifier, generateCodeChallenge, buildAuthUrl,
  exchangeCodeForTokens, refreshAccessToken,
} from '../lib/spotifyAuth'
import { useMusicStore } from '../stores/useMusicStore'
import { useAuthStore } from '../stores/useAuthStore'

const VERIFIER_KEY = 'rc-spotify-verifier'
const STATE_KEY = 'rc-spotify-state'

function randomState() {
  return generateCodeVerifier().slice(0, 24)
}

export async function startConnect() {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state = randomState()
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)
  useMusicStore.getState().setConnecting()
  location.assign(buildAuthUrl({ state, codeChallenge: challenge }))
}

export async function completeConnect({ code, state }) {
  const expectedState = sessionStorage.getItem(STATE_KEY)
  const codeVerifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!expectedState || state !== expectedState) throw new Error('spotify state mismatch')
  const uid = useAuthStore.getState().user?.uid
  if (!uid) throw new Error('not signed in')

  const { accessToken, refreshToken, expiresIn } = await exchangeCodeForTokens({ code, codeVerifier })
  await setDoc(refs.spotifyAuth(uid), shapes.spotifyConnection({ refreshToken, spotifyUserId: null }))
  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
  useMusicStore.getState().setTokens({ accessToken, expiresAt: Date.now() + expiresIn * 1000, spotifyUserId: null })
}

export async function hydrateSpotify(uid) {
  const snap = await getDoc(refs.spotifyAuth(uid))
  if (!snap.exists()) return
  const { refreshToken, spotifyUserId } = snap.data()
  const { accessToken, expiresIn } = await refreshAccessToken(refreshToken)
  useMusicStore.getState().setTokens({ accessToken, expiresAt: Date.now() + expiresIn * 1000, spotifyUserId })
}

export async function disconnectSpotify() {
  const uid = useAuthStore.getState().user?.uid
  if (uid) await deleteDoc(refs.spotifyAuth(uid))
  useMusicStore.getState().disconnect()
}
