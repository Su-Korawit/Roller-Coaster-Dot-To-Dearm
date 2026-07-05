// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProgramDetail from './ProgramDetail'

vi.mock('../../hooks/useMytcas', () => ({
  useTcasRounds: () => ({
    rounds: [{ id: 'r1', name: 'Portfolio', quota: 40, minGpa: 3.5 }],
    loading: false,
  }),
  tcasLogoUrl: () => '',
}))

describe('ProgramDetail', () => {
  it('renders admission rounds', () => {
    render(<ProgramDetail programId="p1" onBack={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText(/ADMISSION ROUNDS/i)).toBeTruthy()
    expect(screen.getByText('Portfolio')).toBeTruthy()
  })
})
