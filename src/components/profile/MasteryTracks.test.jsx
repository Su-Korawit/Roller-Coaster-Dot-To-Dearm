// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import MasteryTracks from './MasteryTracks'
import { useUserStore } from '../../stores/useUserStore'

describe('MasteryTracks', () => {
  beforeEach(() => {
    useUserStore.setState({
      journeys: { mastery: [{ id: 'm1', title: 'Hackathon', desc: '', progress: 40 }], career: [], university: [] },
      activeMasteryBlockId: null,
    })
  })

  it('renders the mastery journey items', () => {
    render(<MasteryTracks />)
    expect(screen.getByText('Hackathon')).toBeTruthy()
  })

  it('shows the AI roadmap generate button', () => {
    render(<MasteryTracks />)
    expect(screen.getByRole('button', { name: /roadmap|generate|สร้าง/i })).toBeTruthy()
  })
})
