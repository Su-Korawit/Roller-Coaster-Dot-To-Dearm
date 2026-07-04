// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FeatureHighlights from './FeatureHighlights'

describe('FeatureHighlights', () => {
  it('renders all three feature pillars with detail bullets, not just a headline', () => {
    render(<FeatureHighlights />)
    expect(screen.getByText('AI ROADMAP')).toBeTruthy()
    expect(screen.getByText('SOCIAL MATCH')).toBeTruthy()
    expect(screen.getByText('GAME WORLD')).toBeTruthy()
    expect(screen.getByText(/Match Score/)).toBeTruthy()
    // "Personal Map" appears in two different features' bullets — assert both are present.
    expect(screen.getAllByText(/Personal Map/).length).toBe(2)
  })
})
