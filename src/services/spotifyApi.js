// Thin Spotify Web API wrappers. Every call takes a fresh access token; the
// caller (useSpotifyToken.withFreshToken) handles refresh-on-401. See adr/0010.
import { SPOTIFY_API_BASE } from '../constants/spotify'

export class SpotifyError extends Error {
  constructor(status, reason, message) {
    super(message ?? `spotify ${status} ${reason}`)
    this.name = 'SpotifyError'
    this.status = status
    this.reason = reason
  }
}

function classify(status, bodyText, endpoint = '') {
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) {
    if (endpoint.includes('/playlists/') && endpoint.includes('/items')) return 'PLAYLIST_ACCESS_DENIED'
    return 'PREMIUM_REQUIRED'
  }
  if (status === 429) return 'RATE_LIMITED'
  if (status === 404) {
    try {
      const reason = JSON.parse(bodyText)?.error?.reason
      if (reason === 'NO_ACTIVE_DEVICE') return 'NO_ACTIVE_DEVICE'
    } catch { /* fallthrough */ }
    return 'NOT_FOUND'
  }
  return 'UNKNOWN'
}

export async function spotifyFetch(accessToken, endpoint, { method = 'GET', body } = {}) {
  const res = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) throw new SpotifyError(res.status, classify(res.status, await res.text(), endpoint))
  if (res.status === 204) return null
  return res.json()
}

function mapTrack(t) {
  return {
    id: t.id,
    name: t.name,
    artists: (t.artists ?? []).map((a) => a.name).join(', '),
    albumArt: t.album?.images?.[0]?.url ?? null,
    uri: t.uri,
    durationMs: t.duration_ms,
  }
}

export async function searchTracks(accessToken, q) {
  const params = new URLSearchParams({ q, type: 'track', limit: '20' })
  const data = await spotifyFetch(accessToken, `/search?${params.toString()}`)
  return (data?.tracks?.items ?? []).map(mapTrack)
}

export async function getMyPlaylists(accessToken) {
  const [me, data] = await Promise.all([
    spotifyFetch(accessToken, '/me'),
    spotifyFetch(accessToken, '/me/playlists?limit=50'),
  ])
  const myId = me?.id
  return (data?.items ?? [])
    .filter((p) => p.owner?.id === myId || p.collaborative)
    .map((p) => ({ id: p.id, name: p.name, imageUrl: p.images?.[0]?.url ?? null, uri: p.uri }))
}

export async function getPlaylistTracks(accessToken, playlistId) {
  const data = await spotifyFetch(accessToken, `/playlists/${playlistId}/items?limit=100`)
  return (data?.items ?? []).map((i) => i.item ?? i.track).filter(Boolean).map(mapTrack)
}

export async function getDevices(accessToken) {
  const data = await spotifyFetch(accessToken, '/me/player/devices')
  return (data?.devices ?? []).map((d) => ({ id: d.id, name: d.name, isActive: d.is_active }))
}

export async function getPlaybackState(accessToken) {
  const data = await spotifyFetch(accessToken, '/me/player')
  if (!data || !data.item) return null
  return {
    isPlaying: data.is_playing,
    track: mapTrack(data.item),
    progressMs: data.progress_ms ?? 0,
    device: data.device ? { id: data.device.id, name: data.device.name, isActive: data.device.is_active } : null,
    volumePercent: data.device?.volume_percent ?? 100,
  }
}

export function transferPlayback(accessToken, deviceId) {
  return spotifyFetch(accessToken, '/me/player', { method: 'PUT', body: { device_ids: [deviceId], play: true } })
}

export function play(accessToken, { uris, contextUri, deviceId } = {}) {
  const query = deviceId ? `?device_id=${deviceId}` : ''
  const body = uris ? { uris } : contextUri ? { context_uri: contextUri } : undefined
  return spotifyFetch(accessToken, `/me/player/play${query}`, { method: 'PUT', body })
}

export const pause = (accessToken) => spotifyFetch(accessToken, '/me/player/pause', { method: 'PUT' })
export const next = (accessToken) => spotifyFetch(accessToken, '/me/player/next', { method: 'POST' })
export const previous = (accessToken) => spotifyFetch(accessToken, '/me/player/previous', { method: 'POST' })
export const seek = (accessToken, positionMs) =>
  spotifyFetch(accessToken, `/me/player/seek?position_ms=${Math.round(positionMs)}`, { method: 'PUT' })
export const setVolume = (accessToken, percent) =>
  spotifyFetch(accessToken, `/me/player/volume?volume_percent=${Math.round(percent)}`, { method: 'PUT' })

export const queueTrack = (accessToken, uri) =>
  spotifyFetch(accessToken, `/me/player/queue?uri=${encodeURIComponent(uri)}`, { method: 'POST' })
export const setShuffle = (accessToken, state) =>
  spotifyFetch(accessToken, `/me/player/shuffle?state=${state ? 'true' : 'false'}`, { method: 'PUT' })
export const setRepeat = (accessToken, state) =>
  spotifyFetch(accessToken, `/me/player/repeat?state=${state}`, { method: 'PUT' })
