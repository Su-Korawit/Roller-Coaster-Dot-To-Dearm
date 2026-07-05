// src/lib/spotifyAuth.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateCodeVerifier, generateCodeChallenge, buildAuthUrl, exchangeCodeForTokens, refreshAccessToken } from './spotifyAuth'

vi.mock('../constants/spotify', () => ({
  SPOTIFY_AUTH_URL: 'https://accounts.spotify.com/authorize',
  SPOTIFY_TOKEN_URL: 'https://token.test/api/token',
  SPOTIFY_SCOPES: ['scope-a', 'scope-b'],
  clientId: () => 'CLIENT123',
  redirectUri: () => 'https://example.app/music/callback',
}))

describe('spotifyAuth PKCE', () => {
  it('code verifier is 64 url-safe chars', () => {
    const v = generateCodeVerifier()
    expect(v).toHaveLength(64)
    expect(v).toMatch(/^[A-Za-z0-9\-._~]+$/)
  })

  it('code challenge is deterministic base64url of SHA-256', async () => {
    const c = await generateCodeChallenge('abc')
    // base64url has no +, /, or = padding
    expect(c).not.toMatch(/[+/=]/)
    expect(await generateCodeChallenge('abc')).toBe(c)
  })

  it('buildAuthUrl includes required params', () => {
    const url = new URL(buildAuthUrl({ state: 'st8', codeChallenge: 'chal' }))
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    const p = url.searchParams
    expect(p.get('client_id')).toBe('CLIENT123')
    expect(p.get('response_type')).toBe('code')
    expect(p.get('redirect_uri')).toBe('https://example.app/music/callback')
    expect(p.get('code_challenge_method')).toBe('S256')
    expect(p.get('code_challenge')).toBe('chal')
    expect(p.get('state')).toBe('st8')
    expect(p.get('scope')).toBe('scope-a scope-b')
  })

  it('exchangeCodeForTokens posts form body and maps snake_case', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const out = await exchangeCodeForTokens({ code: 'CODE', codeVerifier: 'VER' })
    expect(out).toEqual({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 3600 })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://token.test/api/token')
    expect(opts.method).toBe('POST')
    const body = new URLSearchParams(opts.body)
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('CODE')
    expect(body.get('code_verifier')).toBe('VER')
    expect(body.get('client_id')).toBe('CLIENT123')
  })

  it('refreshAccessToken keeps old refresh token when Spotify omits it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'AT2', expires_in: 3600 }),
    }))
    const out = await refreshAccessToken('OLD_RT')
    expect(out).toEqual({ accessToken: 'AT2', refreshToken: 'OLD_RT', expiresIn: 3600 })
  })
})
