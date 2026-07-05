// Spotify Web API / OAuth constants. Client-side PKCE — client id is public,
// there is NO client secret. See docs/adr/0010.
export const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
export const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
export const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

export const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
]

export class SpotifyConfigError extends Error {
  constructor() {
    super('VITE_SPOTIFY_CLIENT_ID is not configured')
    this.name = 'SpotifyConfigError'
    this.reason = 'SPOTIFY_NOT_CONFIGURED'
  }
}

export function clientId() {
  const id = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  if (!id) throw new SpotifyConfigError()
  return id
}

export function redirectUri() {
  return `${location.origin}/music/callback`
}
