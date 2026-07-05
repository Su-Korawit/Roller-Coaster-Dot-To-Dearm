// @vitest-environment jsdom
// src/hooks/useNowPlayingPoll.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('./useSpotifyToken', () => ({ withFreshToken: (fn) => fn('AT') }))
vi.mock('../services/spotifyApi', () => ({ getPlaybackState: vi.fn() }))

import { useNowPlayingPoll } from './useNowPlayingPoll'
import { useMusicStore } from '../stores/useMusicStore'
import { getPlaybackState } from '../services/spotifyApi'

beforeEach(() => {
  vi.useFakeTimers()
  useMusicStore.getState().disconnect()
  getPlaybackState.mockReset()
})
afterEach(() => vi.useRealTimers())

describe('useNowPlayingPoll', () => {
  it('does not poll while disconnected', () => {
    renderHook(() => useNowPlayingPoll())
    vi.advanceTimersByTime(6000)
    expect(getPlaybackState).not.toHaveBeenCalled()
  })

  it('polls every 5s when connected and applies playback', async () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: Date.now() + 1e6, spotifyUserId: 'u' })
    getPlaybackState.mockResolvedValue({ isPlaying: true, track: { id: 't' }, progressMs: 0, device: null, volumePercent: 80 })
    renderHook(() => useNowPlayingPoll())
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(getPlaybackState).toHaveBeenCalled()
    expect(useMusicStore.getState().currentTrack).toEqual({ id: 't' })
  })
})
