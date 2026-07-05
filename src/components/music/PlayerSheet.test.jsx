// @vitest-environment jsdom
// src/components/music/PlayerSheet.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../hooks/useSpotifyToken', () => ({ withFreshToken: (fn) => fn('AT') }))
vi.mock('../../services/spotifyApi', () => ({
  searchTracks: vi.fn(), play: vi.fn().mockResolvedValue(), pause: vi.fn(), next: vi.fn(), previous: vi.fn(),
  getDevices: vi.fn().mockResolvedValue([]), transferPlayback: vi.fn(),
}))
vi.mock('../../services/spotifyConnect', () => ({ startConnect: vi.fn(), disconnectSpotify: vi.fn() }))

import PlayerSheet from './PlayerSheet'
import { useMusicStore } from '../../stores/useMusicStore'
import { searchTracks, play } from '../../services/spotifyApi'
import { startConnect } from '../../services/spotifyConnect'

beforeEach(() => {
  useMusicStore.getState().disconnect()
  useMusicStore.getState().openSheet()
  searchTracks.mockReset().mockResolvedValue([])
  play.mockClear()
  startConnect.mockClear()
})

describe('PlayerSheet', () => {
  it('shows connect button when disconnected', () => {
    render(<PlayerSheet />)
    fireEvent.click(screen.getByRole('button', { name: /เชื่อม Spotify/ }))
    expect(startConnect).toHaveBeenCalled()
  })

  it('searches and plays a tapped track', async () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: Date.now() + 1e6, spotifyUserId: 'u' })
    searchTracks.mockResolvedValue([{ id: 't1', name: 'Song', artists: 'A', albumArt: null, uri: 'spotify:track:t1', durationMs: 1000 }])
    render(<PlayerSheet />)
    fireEvent.change(screen.getByPlaceholderText(/ค้นหาเพลง/), { target: { value: 'hello' } })
    const item = await screen.findByText('Song')
    fireEvent.click(item)
    await waitFor(() => expect(play).toHaveBeenCalledWith('AT', { uris: ['spotify:track:t1'] }))
    expect(useMusicStore.getState().isPlaying).toBe(true)
  })
})
