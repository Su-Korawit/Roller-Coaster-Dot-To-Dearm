// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let authState
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

let selectState
vi.mock('../../stores/useSelectStore', () => ({
  useSelectStore: (sel) => sel(selectState),
}))

vi.mock('./OnboardingIntro', () => ({
  default: ({ onNext }) => <button onClick={onNext}>INTRO_NEXT</button>,
}))
vi.mock('./MbtiStep', () => ({
  default: ({ onNext }) => <button onClick={onNext}>MBTI_NEXT</button>,
}))
vi.mock('./CareerStep', () => ({
  default: ({ onNext }) => <button onClick={onNext}>CAREER_NEXT</button>,
}))
vi.mock('./MasteryStep', () => ({
  default: ({ onNext }) => <button onClick={onNext}>MASTERY_NEXT</button>,
}))
vi.mock('./UniversityStep', () => ({
  default: ({ onNext }) => <button onClick={onNext}>UNIVERSITY_NEXT</button>,
}))
vi.mock('./ProgramStep', () => ({
  default: ({ onNext, onBack }) => (
    <>
      <button onClick={onNext}>PROGRAM_NEXT</button>
      <button onClick={onBack}>PROGRAM_BACK</button>
    </>
  ),
}))

const { default: OnboardingModal } = await import('./OnboardingModal')
const { useOnboardingUiStore } = await import('../../stores/useOnboardingUiStore')

function walkToProgram() {
  fireEvent.click(screen.getByText('INTRO_NEXT'))
  fireEvent.click(screen.getByText('MBTI_NEXT'))
  fireEvent.click(screen.getByText('CAREER_NEXT'))
  fireEvent.click(screen.getByText('MASTERY_NEXT'))
  fireEvent.click(screen.getByText('UNIVERSITY_NEXT'))
}

describe('OnboardingModal', () => {
  beforeEach(() => {
    useOnboardingUiStore.setState({ forceOpen: false })
  })

  it('is hidden when there is no signed-in user', () => {
    authState = { user: null }
    selectState = { program: null }
    const { container } = render(<OnboardingModal />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the intro step when a signed-in user has no program', () => {
    authState = { user: { uid: 'u1' } }
    selectState = { program: null }
    render(<OnboardingModal />)
    expect(screen.getByText('INTRO_NEXT')).toBeTruthy()
  })

  it('stays hidden once program is set and the modal was not force-opened', () => {
    authState = { user: { uid: 'u1' } }
    selectState = { program: 'PROG1' }
    const { container } = render(<OnboardingModal />)
    expect(container.firstChild).toBeNull()
  })

  it('shows even with a program already set when forceOpen is true (edit re-entry)', () => {
    useOnboardingUiStore.getState().open()
    authState = { user: { uid: 'u1' } }
    selectState = { program: 'PROG1' }
    render(<OnboardingModal />)
    expect(screen.getByText('INTRO_NEXT')).toBeTruthy()
  })

  it('walks intro through every step to program on next()', () => {
    authState = { user: { uid: 'u1' } }
    selectState = { program: null }
    render(<OnboardingModal />)
    walkToProgram()
    expect(screen.getByText('PROGRAM_NEXT')).toBeTruthy()
  })

  it('program onBack steps back to university (missing-university fallback)', () => {
    authState = { user: { uid: 'u1' } }
    selectState = { program: null }
    render(<OnboardingModal />)
    walkToProgram()
    fireEvent.click(screen.getByText('PROGRAM_BACK'))
    expect(screen.getByText('UNIVERSITY_NEXT')).toBeTruthy()
  })

  it('clears forceOpen when the program step finishes', () => {
    useOnboardingUiStore.getState().open()
    authState = { user: { uid: 'u1' } }
    selectState = { program: 'PROG1' }
    render(<OnboardingModal />)
    walkToProgram()
    fireEvent.click(screen.getByText('PROGRAM_NEXT'))
    expect(useOnboardingUiStore.getState().forceOpen).toBe(false)
  })
})
