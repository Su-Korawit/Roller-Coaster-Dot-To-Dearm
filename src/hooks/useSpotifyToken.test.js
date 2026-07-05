// src/hooks/useSpotifyToken.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/spotifyAuth', () => ({ refreshAccessToken: vi.fn() }))
vi.mock('../lib/db', () => ({ refs: { spotifyAuth: (uid) => ({ uid }) } }))
vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(), setDoc: vi.fn(), serverTimestamp: () => 'ts' }))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: { uid: 'alice' } }) } }))

import { ensureFreshToken, withFreshToken } from './useSpotifyToken'
import { useMusicStore } from '../stores/useMusicStore'
import { refreshAccessToken } from '../lib/spotifyAuth'
import { getDoc } from 'firebase/firestore'
import { SpotifyError } from '../services/spotifyApi'

const NOW = 1_000_000
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  useMusicStore.getState().disconnect()
  refreshAccessToken.mockReset()
  getDoc.mockReset()
})

describe('ensureFreshToken', () => {
  it('returns current token when not near expiry', async () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: NOW + 5 * 60_000, spotifyUserId: 'u' })
    expect(await ensureFreshToken()).toBe('AT')
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('refreshes when within 60s of expiry using the stored refresh token', async () => {
    useMusicStore.getState().setTokens({ accessToken: 'OLD', expiresAt: NOW + 10_000, spotifyUserId: 'u' })
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ refreshToken: 'RT' }) })
    refreshAccessToken.mockResolvedValue({ accessToken: 'NEW', refreshToken: 'RT', expiresIn: 3600 })
    expect(await ensureFreshToken()).toBe('NEW')
    expect(refreshAccessToken).toHaveBeenCalledWith('RT')
    expect(useMusicStore.getState().accessToken).toBe('NEW')
  })
})

describe('withFreshToken', () => {
  it('refreshes once and retries on UNAUTHORIZED', async () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: NOW + 5 * 60_000, spotifyUserId: 'u' })
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ refreshToken: 'RT' }) })
    refreshAccessToken.mockResolvedValue({ accessToken: 'NEW', refreshToken: 'RT', expiresIn: 3600 })
    const fn = vi.fn()
      .mockRejectedValueOnce(new SpotifyError(401, 'UNAUTHORIZED'))
      .mockResolvedValueOnce('ok')
    expect(await withFreshToken(fn)).toBe('ok')
    expect(fn).toHaveBeenNthCalledWith(1, 'AT')
    expect(fn).toHaveBeenNthCalledWith(2, 'NEW')
  })
})
