import { describe, it, expect, beforeEach } from 'vitest'
import { useMasteryStore, trackProgress } from './useMasteryStore'

describe('useMasteryStore', () => {
  beforeEach(() => useMasteryStore.getState().resetMastery())

  it('toggles a milestone done', () => {
    useMasteryStore.getState().addTrack({
      id: 't1',
      title: 'Hackathon',
      round: 'portfolio',
      milestones: [{ id: 'm1', title: 'Form a Squad', desc: '', done: false }],
      resources: [],
    })
    useMasteryStore.getState().toggleMilestone('t1', 'm1')
    expect(useMasteryStore.getState().tracks[0].milestones[0].done).toBe(true)
  })

  it('computes progress', () => {
    const track = { milestones: [{ done: true }, { done: false }, { done: true }] }
    expect(trackProgress(track)).toEqual({ done: 2, total: 3 })
  })
})
