// src/services/spotifyApi.test.js
import { describe, it, expect, vi } from 'vitest'
import { spotifyFetch, SpotifyError, searchTracks, play, pause } from './spotifyApi'

function res({ ok = true, status = 200, json = {}, text = '' }) {
  return { ok, status, json: () => Promise.resolve(json), text: () => Promise.resolve(text) }
}

describe('spotifyFetch error classification', () => {
  it('403 → PREMIUM_REQUIRED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res({ ok: false, status: 403, text: 'x' })))
    await expect(spotifyFetch('AT', '/me/player/play', { method: 'PUT' }))
      .rejects.toMatchObject({ status: 403, reason: 'PREMIUM_REQUIRED' })
  })

  it('404 with reason NO_ACTIVE_DEVICE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      res({ ok: false, status: 404, text: JSON.stringify({ error: { reason: 'NO_ACTIVE_DEVICE' } }) })
    ))
    await expect(spotifyFetch('AT', '/me/player/play', { method: 'PUT' }))
      .rejects.toMatchObject({ status: 404, reason: 'NO_ACTIVE_DEVICE' })
  })

  it('429 → RATE_LIMITED, 401 → UNAUTHORIZED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res({ ok: false, status: 429, text: '' })))
    await expect(spotifyFetch('AT', '/x')).rejects.toMatchObject({ reason: 'RATE_LIMITED' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res({ ok: false, status: 401, text: '' })))
    await expect(spotifyFetch('AT', '/x')).rejects.toMatchObject({ reason: 'UNAUTHORIZED' })
  })

  it('204 returns null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res({ ok: true, status: 204 })))
    expect(await spotifyFetch('AT', '/me/player/pause', { method: 'PUT' })).toBeNull()
  })
})

describe('wrappers', () => {
  it('searchTracks maps items to flat track shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(res({ json: { tracks: { items: [
      { id: 't1', name: 'Song', uri: 'spotify:track:t1', duration_ms: 1000,
        artists: [{ name: 'A' }, { name: 'B' }], album: { images: [{ url: 'IMG' }] } },
    ] } } }))
    vi.stubGlobal('fetch', fetchMock)
    const out = await searchTracks('AT', 'hello')
    expect(out).toEqual([{ id: 't1', name: 'Song', artists: 'A, B', albumArt: 'IMG', uri: 'spotify:track:t1', durationMs: 1000 }])
    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('/search?')
    expect(url).toContain('type=track')
    expect(url).toContain('q=hello')
  })

  it('play sends uris in body via PUT', async () => {
    const fetchMock = vi.fn().mockResolvedValue(res({ ok: true, status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await play('AT', { uris: ['spotify:track:t1'] })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/me/player/play')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ uris: ['spotify:track:t1'] })
  })

  it('pause is a PUT to /me/player/pause', async () => {
    const fetchMock = vi.fn().mockResolvedValue(res({ ok: true, status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await pause('AT')
    expect(fetchMock.mock.calls[0][0]).toContain('/me/player/pause')
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
  })
})
