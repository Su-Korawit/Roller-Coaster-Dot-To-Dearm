// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MasteryTrackDetail from './MasteryTrackDetail'
import { useMasteryStore } from '../../stores/useMasteryStore'

describe('MasteryTrackDetail', () => {
  beforeEach(() => {
    useMasteryStore.getState().resetMastery()
    useMasteryStore.getState().addTrack({
      id: 't1',
      title: 'Hackathon',
      round: 'portfolio',
      milestones: [{ id: 'm1', title: 'Form a Squad', desc: '', done: false }],
      resources: [],
    })
  })

  it('renders track title + milestones heading; back arrow calls onBack', () => {
    const onBack = vi.fn()
    render(<MasteryTrackDetail trackId="t1" onBack={onBack} />)
    expect(screen.getByText('Hackathon')).toBeTruthy()
    expect(screen.getByText('Milestones')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Back'))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
