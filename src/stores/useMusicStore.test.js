// src/stores/useMusicStore.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { useMusicStore } from './useMusicStore'

const reset = () => useMusicStore.getState().disconnect()

describe('useMusicStore', () => {
  beforeEach(reset)

  it('starts disconnected', () => {
    expect(useMusicStore.getState().status).toBe('disconnected')
    expect(useMusicStore.getState().accessToken).toBeNull()
  })

  it('setTokens marks connected', () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: 123, spotifyUserId: 'u1' })
    const s = useMusicStore.getState()
    expect(s.status).toBe('connected')
    expect(s.accessToken).toBe('AT')
    expect(s.spotifyUserId).toBe('u1')
  })

  it('applyPlayback copies isPlaying/track/device, null clears track', () => {
    useMusicStore.getState().applyPlayback({ isPlaying: true, track: { id: 't' }, progressMs: 10, device: { id: 'd' }, volumePercent: 55 })
    expect(useMusicStore.getState().isPlaying).toBe(true)
    expect(useMusicStore.getState().currentTrack).toEqual({ id: 't' })
    expect(useMusicStore.getState().volumePercent).toBe(55)
    useMusicStore.getState().applyPlayback(null)
    expect(useMusicStore.getState().currentTrack).toBeNull()
    expect(useMusicStore.getState().isPlaying).toBe(false)
  })

  it('setPlaying flips optimistically', () => {
    useMusicStore.getState().setPlaying(true)
    expect(useMusicStore.getState().isPlaying).toBe(true)
  })

  it('disconnect wipes tokens but keeps volume', () => {
    useMusicStore.getState().setVolumePercent(42)
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: 1, spotifyUserId: 'u' })
    useMusicStore.getState().disconnect()
    expect(useMusicStore.getState().accessToken).toBeNull()
    expect(useMusicStore.getState().status).toBe('disconnected')
    expect(useMusicStore.getState().volumePercent).toBe(42)
  })
})
