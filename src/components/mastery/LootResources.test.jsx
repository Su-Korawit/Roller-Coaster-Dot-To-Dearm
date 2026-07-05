// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import LootResources from './LootResources'
import { useMasteryStore } from '../../stores/useMasteryStore'

describe('LootResources', () => {
  beforeEach(() => {
    useMasteryStore.getState().resetMastery()
    useMasteryStore.getState().addTrack({
      id: 't1',
      title: 'Hackathon',
      round: 'portfolio',
      milestones: [],
      resources: [
        { id: 'r1', type: 'course', title: 'Intro to CS', url: 'https://example.com' },
        { id: 'r2', type: 'book', title: 'Algorithms 101', url: 'https://example.com/book' },
      ],
    })
  })

  it('renders each resource title and type label', () => {
    render(<LootResources trackId="t1" />)
    expect(screen.getByText('Intro to CS')).toBeTruthy()
    expect(screen.getByText('Algorithms 101')).toBeTruthy()
    expect(screen.getByText('COURSE')).toBeTruthy()
    expect(screen.getByText('BOOK')).toBeTruthy()
  })

  it('shows empty state when no resources', () => {
    useMasteryStore.getState().resetMastery()
    useMasteryStore.getState().addTrack({
      id: 't2',
      title: 'Empty',
      round: 'admission',
      milestones: [],
      resources: [],
    })
    render(<LootResources trackId="t2" />)
    expect(screen.getByText('ยังไม่มีแหล่งเรียนรู้')).toBeTruthy()
  })
})
