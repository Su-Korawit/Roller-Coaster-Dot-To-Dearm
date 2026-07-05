// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OnboardingIntro from './OnboardingIntro'

describe('OnboardingIntro', () => {
  it('renders the welcome CTA and calls onNext', () => {
    const onNext = vi.fn()
    render(<OnboardingIntro onNext={onNext} />)
    expect(screen.getByText('เริ่มเลย')).toBeTruthy()
    fireEvent.click(screen.getByText('เริ่มเลย'))
    expect(onNext).toHaveBeenCalledOnce()
  })
})
