// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MasteryRoundSection from './MasteryRoundSection'
import { useMasteryStore } from '../../stores/useMasteryStore'

describe('MasteryRoundSection', () => {
  beforeEach(() => {
    useMasteryStore.getState().resetMastery()
    useMasteryStore.getState().addTrack({
      id: 't1',
      title: 'Hackathon',
      round: 'portfolio',
      milestones: [],
      resources: [],
    })
  })

  it('renders tracks for its round and opens one', () => {
    const onOpen = vi.fn()
    render(<MasteryRoundSection round="portfolio" label="Portfolio" onOpen={onOpen} />)
    fireEvent.click(screen.getByText('Hackathon'))
    expect(onOpen).toHaveBeenCalledWith('t1')
  })
})
