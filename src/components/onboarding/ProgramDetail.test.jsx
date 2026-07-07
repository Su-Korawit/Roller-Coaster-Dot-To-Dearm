// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProgramDetail from './ProgramDetail'

let roundsState
vi.mock('../../hooks/useMytcas', () => ({
  useTcasRounds: () => roundsState,
  tcasLogoUrl: () => '',
}))

describe('ProgramDetail', () => {
  beforeEach(() => {
    roundsState = {
      rounds: [{ id: 'r1', name: 'Portfolio', quota: 40, minGpa: 3.5 }],
      announced: true,
      tcasYear: 2570,
      loading: false,
    }
  })

  it('renders admission rounds', () => {
    render(<ProgramDetail programId="p1" onBack={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText(/ADMISSION ROUNDS/i)).toBeTruthy()
    expect(screen.getByText('Portfolio')).toBeTruthy()
  })

  it('explains that criteria are not yet announced when the cycle has no data', () => {
    roundsState = { rounds: [], announced: false, tcasYear: 2570, loading: false }
    render(<ProgramDetail programId="p1" onBack={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText(/TCAS70 ยังไม่ประกาศ/)).toBeTruthy()
  })
})
