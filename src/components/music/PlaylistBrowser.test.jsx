// @vitest-environment jsdom
// src/components/music/PlaylistBrowser.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../hooks/useSpotifyToken', () => ({ withFreshToken: (fn) => fn('AT') }))
vi.mock('../../services/spotifyApi', () => ({
  getMyPlaylists: vi.fn(),
  getPlaylistTracks: vi.fn(),
  play: vi.fn().mockResolvedValue(),
}))

import PlaylistBrowser from './PlaylistBrowser'
import { useMusicStore } from '../../stores/useMusicStore'
import { getMyPlaylists, getPlaylistTracks, play } from '../../services/spotifyApi'

const PL = { id: 'p1', name: 'Focus', imageUrl: null, uri: 'spotify:playlist:p1' }
const TRACK = { id: 't1', name: 'Song', artists: 'A', albumArt: null, uri: 'spotify:track:t1', durationMs: 1000 }

beforeEach(() => {
  useMusicStore.getState().disconnect()
  getMyPlaylists.mockReset().mockResolvedValue([PL])
  getPlaylistTracks.mockReset().mockResolvedValue([TRACK])
  play.mockClear()
})

describe('PlaylistBrowser', () => {
  it('loads and lists the user playlists on mount', async () => {
    render(<PlaylistBrowser />)
    await screen.findByText('Focus')
    expect(getMyPlaylists).toHaveBeenCalledTimes(1)
  })

  it('opens a playlist and shows its tracks', async () => {
    render(<PlaylistBrowser />)
    fireEvent.click(await screen.findByText('Focus'))
    await screen.findByText('Song')
    expect(getPlaylistTracks).toHaveBeenCalledWith('AT', 'p1')
  })

  it('plays a single tapped track with its uri', async () => {
    render(<PlaylistBrowser />)
    fireEvent.click(await screen.findByText('Focus'))
    fireEvent.click(await screen.findByText('Song'))
    await waitFor(() => expect(play).toHaveBeenCalledWith('AT', { uris: ['spotify:track:t1'] }))
    expect(useMusicStore.getState().isPlaying).toBe(true)
  })

  it('play-all uses the playlist context uri', async () => {
    render(<PlaylistBrowser />)
    fireEvent.click(await screen.findByText('Focus'))
    fireEvent.click(await screen.findByRole('button', { name: /เล่นทั้งหมด/ }))
    await waitFor(() => expect(play).toHaveBeenCalledWith('AT', { contextUri: 'spotify:playlist:p1' }))
  })
})
