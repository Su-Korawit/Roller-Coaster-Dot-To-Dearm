// @vitest-environment jsdom
// src/services/spotifyConnect.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../constants/spotify', () => ({
  clientId: vi.fn(() => 'CLIENT123'),
  SpotifyConfigError: class SpotifyConfigError extends Error {
    reason = 'SPOTIFY_NOT_CONFIGURED'
  },
}))
vi.mock('../lib/spotifyAuth', () => ({
  generateCodeVerifier: () => 'VER',
  generateCodeChallenge: vi.fn().mockResolvedValue('CHAL'),
  buildAuthUrl: vi.fn(() => 'https://auth/url'),
  exchangeCodeForTokens: vi.fn(),
  refreshAccessToken: vi.fn(),
}))
vi.mock('../lib/db', () => ({
  refs: { spotifyAuth: (uid) => ({ path: `users/${uid}/private/spotify` }) },
  shapes: { spotifyConnection: (x) => ({ ...x, connectedAt: 'ts' }) },
}))
vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn() }))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: { uid: 'alice' } }) } }))

import { startConnect, completeConnect, hydrateSpotify } from './spotifyConnect'
import { useMusicStore } from '../stores/useMusicStore'
import { clientId } from '../constants/spotify'
import { exchangeCodeForTokens, refreshAccessToken } from '../lib/spotifyAuth'
import { getDoc, setDoc } from 'firebase/firestore'

beforeEach(() => {
  useMusicStore.getState().disconnect()
  sessionStorage.clear()
  vi.stubGlobal('location', { assign: vi.fn(), origin: 'https://example.app' })
  vi.spyOn(Date, 'now').mockReturnValue(1000)
})

describe('startConnect', () => {
  it('stores verifier+state and redirects', async () => {
    await startConnect()
    expect(sessionStorage.getItem('rc-spotify-verifier')).toBe('VER')
    expect(sessionStorage.getItem('rc-spotify-state')).toBeTruthy()
    expect(location.assign).toHaveBeenCalledWith('https://auth/url')
    expect(useMusicStore.getState().status).toBe('connecting')
  })

  it('does not redirect when VITE_SPOTIFY_CLIENT_ID is missing', async () => {
    const err = new Error('missing')
    err.reason = 'SPOTIFY_NOT_CONFIGURED'
    clientId.mockImplementationOnce(() => { throw err })
    await startConnect()
    expect(location.assign).not.toHaveBeenCalled()
    expect(useMusicStore.getState().lastError).toBe('SPOTIFY_NOT_CONFIGURED')
    expect(useMusicStore.getState().status).toBe('disconnected')
  })
})

describe('completeConnect', () => {
  it('rejects a mismatched state without writing tokens', async () => {
    sessionStorage.setItem('rc-spotify-state', 'GOOD')
    sessionStorage.setItem('rc-spotify-verifier', 'VER')
    await expect(completeConnect({ code: 'C', state: 'BAD' })).rejects.toThrow(/state/i)
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('exchanges, persists refresh token, sets tokens', async () => {
    sessionStorage.setItem('rc-spotify-state', 'GOOD')
    sessionStorage.setItem('rc-spotify-verifier', 'VER')
    exchangeCodeForTokens.mockResolvedValue({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 3600 })
    await completeConnect({ code: 'C', state: 'GOOD' })
    expect(exchangeCodeForTokens).toHaveBeenCalledWith({ code: 'C', codeVerifier: 'VER' })
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ refreshToken: 'RT' }))
    expect(useMusicStore.getState().accessToken).toBe('AT')
    expect(useMusicStore.getState().status).toBe('connected')
  })
})

describe('hydrateSpotify', () => {
  it('does nothing when no connection doc', async () => {
    getDoc.mockResolvedValue({ exists: () => false })
    await hydrateSpotify('alice')
    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(useMusicStore.getState().status).toBe('disconnected')
  })

  it('refreshes and connects when a token exists', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ refreshToken: 'RT', spotifyUserId: 'u1' }) })
    refreshAccessToken.mockResolvedValue({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 3600 })
    await hydrateSpotify('alice')
    expect(useMusicStore.getState().status).toBe('connected')
    expect(useMusicStore.getState().accessToken).toBe('AT')
  })
})
