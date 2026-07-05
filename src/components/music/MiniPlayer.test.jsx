// @vitest-environment jsdom
// src/components/music/MiniPlayer.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../../hooks/useNowPlayingPoll', () => ({ useNowPlayingPoll: () => {} }))
vi.mock('./PlayerSheet', () => ({ default: () => <div data-testid="player-sheet" /> }))

import MiniPlayer from './MiniPlayer'
import { useMusicStore } from '../../stores/useMusicStore'

beforeEach(() => useMusicStore.getState().disconnect())

describe('MiniPlayer', () => {
  it('opens the sheet from the connect pill when disconnected', () => {
    render(<MiniPlayer />)
    fireEvent.click(screen.getByRole('button', { name: /เชื่อม Spotify/ }))
    expect(useMusicStore.getState().sheetOpen).toBe(true)
    expect(screen.getByTestId('player-sheet')).toBeTruthy()
  })

  it('shows the current track name when connected + playing', () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: Date.now() + 1e6, spotifyUserId: 'u' })
    useMusicStore.getState().applyPlayback({ isPlaying: true, track: { id: 't', name: 'My Song', artists: 'A', albumArt: null }, progressMs: 0, device: null, volumePercent: 100 })
    render(<MiniPlayer />)
    expect(screen.getByText('My Song')).toBeTruthy()
  })
})
