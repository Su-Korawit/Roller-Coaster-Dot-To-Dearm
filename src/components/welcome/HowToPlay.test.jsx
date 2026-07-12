// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HowToPlay from './HowToPlay'

describe('HowToPlay', () => {
  it('renders all 5 steps in order with numbered badges', () => {
    render(<HowToPlay />)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByText(/ช่วยร่าง Roadmap/)).toBeTruthy()
    expect(screen.getByText(/Personal Map ของเพื่อน/)).toBeTruthy()
  })
})
