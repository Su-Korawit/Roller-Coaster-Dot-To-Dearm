// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StepScreen from './StepScreen'

describe('StepScreen', () => {
  it('renders title without stepper dots', () => {
    render(
      <StepScreen title="Test Step" onNext={() => {}} onBack={() => {}}>
        <p>body</p>
      </StepScreen>,
    )
    expect(screen.getByText('Test Step')).toBeTruthy()
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('calls onBack and onNext from footer buttons', () => {
    const onBack = vi.fn()
    const onNext = vi.fn()
    render(
      <StepScreen title="Step" onNext={onNext} onBack={onBack}>
        <p>body</p>
      </StepScreen>,
    )
    fireEvent.click(screen.getByText('ย้อนกลับ'))
    fireEvent.click(screen.getByText('ถัดไป'))
    expect(onBack).toHaveBeenCalledOnce()
    expect(onNext).toHaveBeenCalledOnce()
  })
})
