// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import LevelBadge from './LevelBadge'

afterEach(cleanup)

describe('LevelBadge', () => {
  it('renders nothing for a student with no XP yet', () => {
    const { container } = render(<LevelBadge xp={0} />)
    expect(container.innerHTML).toBe('')
    expect(render(<LevelBadge xp={NaN} />).container.innerHTML).toBe('')
  })

  it('shows the level coin and a progress bar for the XP', () => {
    render(<LevelBadge xp={90} />)           // level 2 (>= 60), 25% to level 3 (180)
    expect(screen.getByTestId('level-coin').textContent).toBe('2')
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25')
    expect(screen.getByLabelText('เลเวล 2')).toBeTruthy()
  })

  it('drives the bar fill through the --pct custom property', () => {
    render(<LevelBadge xp={90} />)
    expect(screen.getByRole('progressbar').style.getPropertyValue('--pct')).toBe('25')
  })
})
