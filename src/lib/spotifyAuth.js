// Authorization Code + PKCE. No client secret (public client). See docs/adr/0010.
import { SPOTIFY_AUTH_URL, SPOTIFY_TOKEN_URL, SPOTIFY_SCOPES, clientId, redirectUri } from '../constants/spotify'

const VERIFIER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

export function generateCodeVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(64))
  return Array.from(bytes, (b) => VERIFIER_CHARS[b % VERIFIER_CHARS.length]).join('')
}

function base64url(bytes) {
  let str = ''
  for (const b of new Uint8Array(bytes)) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function generateCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(digest)
}

export function buildAuthUrl({ state, codeChallenge }) {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
    scope: SPOTIFY_SCOPES.join(' '),
  })
  return `${SPOTIFY_AUTH_URL}?${params.toString()}`
}

async function postToken(body) {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  if (!res.ok) throw new Error(`spotify token endpoint ${res.status}`)
  return res.json()
}

export async function exchangeCodeForTokens({ code, codeVerifier }) {
  const data = await postToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    client_id: clientId(),
    code_verifier: codeVerifier,
  })
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in }
}

export async function refreshAccessToken(refreshToken) {
  const data = await postToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId(),
  })
  // Spotify may or may not return a new refresh token; keep the old one if absent.
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? refreshToken, expiresIn: data.expires_in }
}
