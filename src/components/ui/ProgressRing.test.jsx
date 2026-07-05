// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ProgressRing from './ProgressRing'

describe('ProgressRing', () => {
  it('renders the value/total label by default', () => {
    render(<ProgressRing value={4} total={14} />)
    expect(screen.getByText('4/14')).toBeTruthy()
  })

  it('renders a custom label', () => {
    render(<ProgressRing value={1} total={3} label="เพิ่มได้อีก 2" />)
    expect(screen.getByText('เพิ่มได้อีก 2')).toBeTruthy()
  })
})
