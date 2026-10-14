// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import TemperamentCard from './TemperamentCard'

afterEach(cleanup)

describe('TemperamentCard', () => {
  it('shows level progress and the perk for a student with XP and an MBTI', () => {
    render(<TemperamentCard mbti="INTJ" focusXp={90} />)
    expect(screen.getByText('เลเวล 2')).toBeTruthy()
    expect(screen.getByText('90 / 180 XP')).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25')   // (90-60)/(180-60)
    expect(screen.getByText(/นักวิเคราะห์ · โฟกัสลึก/)).toBeTruthy()
  })

  it('shows only the perk (no empty level bar) before the first session', () => {
    render(<TemperamentCard mbti="ESFP" focusXp={0} />)
    expect(screen.queryByText(/เลเวล/)).toBeNull()
    expect(screen.getByText(/นักผจญภัย · สปรินต์เปิดวัน/)).toBeTruthy()
  })

  it('shows only the level when the MBTI is unknown', () => {
    render(<TemperamentCard mbti={null} focusXp={65} />)
    expect(screen.getByText('เลเวล 2')).toBeTruthy()
    expect(screen.queryByText(/·/)).toBeNull()
  })

  it('renders nothing for a brand-new user with no MBTI and no XP', () => {
    const { container } = render(<TemperamentCard mbti={undefined} focusXp={0} />)
    expect(container.innerHTML).toBe('')
  })

  it('tolerates garbage XP', () => {
    const { container } = render(<TemperamentCard mbti="ENFP" focusXp={NaN} />)
    expect(container.textContent).toContain('นักอุดมคติ')
    expect(container.textContent).not.toContain('เลเวล')
  })
})
