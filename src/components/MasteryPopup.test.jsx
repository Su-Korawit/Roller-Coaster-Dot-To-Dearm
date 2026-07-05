// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MasteryPopup from './MasteryPopup'
import { useMasteryStore } from '../stores/useMasteryStore'

describe('MasteryPopup', () => {
  beforeEach(() => {
    useMasteryStore.getState().resetMastery()
    useMasteryStore.getState().addTrack({
      id: 't1',
      title: 'Hackathon',
      round: 'portfolio',
      milestones: [{ id: 'm1', title: 'Form a Squad', desc: '', done: false }],
      resources: [],
    })
    useMasteryStore.getState().addTrack({
      id: 't2',
      title: 'Portfolio Review',
      round: 'admission',
      milestones: [],
      resources: [],
    })
  })

  it('renders a Mastery heading and both round sections', () => {
    render(<MasteryPopup onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Mastery' })).toBeTruthy()
    expect(screen.getByText('Portfolio')).toBeTruthy()
    expect(screen.getByText('Admission')).toBeTruthy()
  })

  it('opens track detail and returns on back', () => {
    render(<MasteryPopup onClose={() => {}} />)
    fireEvent.click(screen.getByText('Hackathon'))
    expect(screen.getByText('Milestones')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Back'))
    expect(screen.getByText('Portfolio')).toBeTruthy()
  })

  it('closes on backdrop click', () => {
    const onClose = vi.fn()
    const { container } = render(<MasteryPopup onClose={onClose} />)
    fireEvent.click(container.querySelector('[aria-hidden="true"]'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
