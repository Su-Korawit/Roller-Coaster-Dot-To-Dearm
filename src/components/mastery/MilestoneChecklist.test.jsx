// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import MilestoneChecklist from './MilestoneChecklist'
import { useMasteryStore } from '../../stores/useMasteryStore'

describe('MilestoneChecklist', () => {
  beforeEach(() => {
    useMasteryStore.getState().resetMastery()
    useMasteryStore.getState().addTrack({
      id: 't1',
      title: 'Hackathon',
      round: 'portfolio',
      milestones: [{ id: 'm1', title: 'Form a Squad', desc: 'Find teammates', done: false }],
      resources: [],
    })
  })

  it('renders milestones + DONE count and toggles', () => {
    render(<MilestoneChecklist trackId="t1" />)
    expect(screen.getByText('Form a Squad')).toBeTruthy()
    expect(screen.getByText(/0\/1/)).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(useMasteryStore.getState().tracks[0].milestones[0].done).toBe(true)
  })
})
