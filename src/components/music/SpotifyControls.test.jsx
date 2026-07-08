// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let musicState
vi.mock('../../stores/useMusicStore', () => ({
  useMusicStore: Object.assign((sel) => sel(musicState), { getState: () => musicState }),
}))
const api = vi.hoisted(() => ({
  queueTrack: vi.fn().mockResolvedValue(), setShuffle: vi.fn().mockResolvedValue(), setRepeat: vi.fn().mockResolvedValue(),
  searchTracks: vi.fn(), play: vi.fn(), pause: vi.fn(), next: vi.fn(), previous: vi.fn(),
}))
vi.mock('../../services/spotifyApi', () => api)
vi.mock('../../hooks/useSpotifyToken', () => ({ withFreshToken: (fn) => fn('tok') }))
vi.mock('../../services/spotifyConnect', () => ({ startConnect: vi.fn() }))
vi.mock('./PlaylistBrowser', () => ({ default: () => <div data-testid="playlists" /> }))
vi.mock('./DevicePicker', () => ({ default: () => <div data-testid="devices" /> }))

const { default: SpotifyControls } = await import('./SpotifyControls')

describe('SpotifyControls queue/shuffle/repeat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    musicState = {
      status: 'connected', isPlaying: false, lastError: null,
      searchResults: [{ id: 't1', name: 'Song', artists: 'A', albumArt: null, uri: 'spotify:track:t1', durationMs: 1000 }],
      setSearchResults: vi.fn(), setPlaying: vi.fn(), setError: vi.fn(), closeSheet: vi.fn(),
    }
  })

  it('queues a track from its row button', async () => {
    render(<SpotifyControls />)
    fireEvent.click(screen.getByLabelText('เพิ่มเข้าคิว'))
    expect(api.queueTrack).toHaveBeenCalledWith('tok', 'spotify:track:t1')
  })

  it('toggles shuffle', () => {
    render(<SpotifyControls />)
    fireEvent.click(screen.getByLabelText('สุ่มเพลง'))
    expect(api.setShuffle).toHaveBeenCalledWith('tok', true)
  })

  it('cycles repeat off → context → track', () => {
    render(<SpotifyControls />)
    const btn = screen.getByLabelText('เล่นซ้ำ')
    fireEvent.click(btn)
    expect(api.setRepeat).toHaveBeenCalledWith('tok', 'context')
    fireEvent.click(btn)
    expect(api.setRepeat).toHaveBeenCalledWith('tok', 'track')
    fireEvent.click(btn)
    expect(api.setRepeat).toHaveBeenCalledWith('tok', 'off')
  })
})
