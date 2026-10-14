// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
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

  it('expands a real API round (projects[] with scores, seats, GPAX) instead of showing an empty card', () => {
    roundsState = {
      rounds: [{
        round: 3, round_name_th: 'Admission', seats_total: 40,
        projects: [{
          project_id: 'p', project_name_th: 'โครงการ Admission', seats: 40, min_gpax: 2.5, min_total_score: 0,
          scores: [{ key: 'tgat', label: 'TGAT', weight: 30 }, { key: 'alevel_math1', label: 'A-Level คณิต 1', weight: 70 }],
          condition: 'สอบผ่าน', interview_location: null, link: 'https://example.com/a',
        }],
      }],
      announced: true, tcasYear: 2570, loading: false,
    }
    render(<ProgramDetail programId="p1" onBack={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText('รอบ 3 · Admission')).toBeTruthy()
    expect(screen.getByText('รับรวม 40 คน')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /รอบ 3/ }))
    expect(screen.getByText('โครงการ Admission')).toBeTruthy()
    expect(screen.getByText(/รับ 40 คน · GPAX ขั้นต่ำ 2.5/)).toBeTruthy()
    expect(screen.getByText('TGAT')).toBeTruthy()
    expect(screen.getByText('A-Level คณิต 1')).toBeTruthy()
    expect(screen.getByText(/เงื่อนไข: สอบผ่าน/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /ดูประกาศ/ }).getAttribute('href')).toBe('https://example.com/a')
  })

  it('a round with no projects says so rather than rendering nothing', () => {
    roundsState = { rounds: [{ round: 1, round_name_th: 'Portfolio', seats_total: 0, projects: [] }], announced: true, tcasYear: 2570, loading: false }
    render(<ProgramDetail programId="p1" onBack={() => {}} onConfirm={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /รอบ 1/ }))
    expect(screen.getByText(/ยังไม่มีรายละเอียดเกณฑ์/)).toBeTruthy()
  })

  it('explains that criteria are not yet announced when the cycle has no data', () => {
    roundsState = { rounds: [], announced: false, tcasYear: 2570, loading: false }
    render(<ProgramDetail programId="p1" onBack={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText(/TCAS70 ยังไม่ประกาศ/)).toBeTruthy()
  })
})
