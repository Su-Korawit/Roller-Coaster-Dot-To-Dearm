// src/constants/spotify.test.js
import { describe, it, expect, vi } from 'vitest'
import { SPOTIFY_SCOPES, SPOTIFY_AUTH_URL, SPOTIFY_TOKEN_URL, SPOTIFY_API_BASE, redirectUri, clientId, SpotifyConfigError } from './spotify'

describe('spotify constants', () => {
  it('exposes the exact required scopes', () => {
    expect(SPOTIFY_SCOPES).toEqual([
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'playlist-read-private',
      'playlist-read-collaborative',
    ])
  })

  it('points at Spotify accounts + api hosts', () => {
    expect(SPOTIFY_AUTH_URL).toBe('https://accounts.spotify.com/authorize')
    expect(SPOTIFY_TOKEN_URL).toBe('https://accounts.spotify.com/api/token')
    expect(SPOTIFY_API_BASE).toBe('https://api.spotify.com/v1')
  })

  it('builds redirectUri from the current origin', () => {
    vi.stubGlobal('location', { origin: 'https://example.app' })
    expect(redirectUri()).toBe('https://example.app/music/callback')
  })

  it('clientId throws SpotifyConfigError when VITE_SPOTIFY_CLIENT_ID is missing', async () => {
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', '')
    vi.resetModules()
    const mod = await import('./spotify')
    expect(() => mod.clientId()).toThrow(mod.SpotifyConfigError)
  })

  it('clientId returns the env value when set', async () => {
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'abc123')
    vi.resetModules()
    const mod = await import('./spotify')
    expect(mod.clientId()).toBe('abc123')
  })
})
