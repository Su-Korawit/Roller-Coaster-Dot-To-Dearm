// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./SpotifyControls', () => ({ default: () => <div data-testid="spotify-controls" /> }))

const { default: MusicPanel } = await import('./MusicPanel')

const PROPS = {
  onClose: vi.fn(),
  tracks: [{ title: 'Chapter 1', start: 0 }, { title: 'Chapter 2', start: 60 }],
  currentTrackIdx: 0,
  isPlaying: false,
  onTogglePlay: vi.fn(),
  onSelectTrack: vi.fn(),
}

describe('MusicPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the Background tab by default with the track list', () => {
    render(<MusicPanel {...PROPS} />)
    expect(screen.getByText('Chapter 1')).toBeTruthy()
    expect(screen.queryByTestId('spotify-controls')).toBeNull()
  })

  it('switches to the Spotify tab', () => {
    render(<MusicPanel {...PROPS} />)
    fireEvent.click(screen.getByText('Spotify'))
    expect(screen.getByTestId('spotify-controls')).toBeTruthy()
    expect(screen.queryByText('Chapter 1')).toBeNull()
  })

  it('selecting a background track calls onSelectTrack with its index', () => {
    render(<MusicPanel {...PROPS} />)
    fireEvent.click(screen.getByText('Chapter 2'))
    expect(PROPS.onSelectTrack).toHaveBeenCalledWith(1)
  })

  it('play/pause button calls onTogglePlay', () => {
    render(<MusicPanel {...PROPS} />)
    fireEvent.click(screen.getByLabelText('เล่นเพลง'))
    expect(PROPS.onTogglePlay).toHaveBeenCalled()
  })

  it('close button calls onClose', () => {
    render(<MusicPanel {...PROPS} />)
    fireEvent.click(screen.getByLabelText('ปิด'))
    expect(PROPS.onClose).toHaveBeenCalled()
  })
})
