// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let authState
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

let plansState
const setActivePlan = vi.fn((id) => {
  plansState.activePlanId = id
})

const usePlansStoreMock = Object.assign((sel) => sel(plansState), {
  getState: () => plansState,
})

vi.mock('../../stores/usePlansStore', () => ({
  usePlansStore: usePlansStoreMock,
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
vi.mock('./PlansHub', () => ({
  default: ({ onEditPlan, onNext, onBack }) => (
    <>
      <button onClick={() => onEditPlan('plan-2')}>HUB_EDIT_PLAN_2</button>
      <button onClick={onNext}>HUB_NEXT</button>
      <button onClick={onBack}>HUB_BACK</button>
    </>
  ),
}))
vi.mock('./UniversityStep', () => ({
  default: ({ onNext, onBack }) => (
    <>
      <button onClick={onNext}>UNIVERSITY_NEXT</button>
      <button onClick={onBack}>UNIVERSITY_BACK</button>
    </>
  ),
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

function walkToHub() {
  fireEvent.click(screen.getByText('INTRO_NEXT'))
  fireEvent.click(screen.getByText('MBTI_NEXT'))
  fireEvent.click(screen.getByText('CAREER_NEXT'))
  fireEvent.click(screen.getByText('MASTERY_NEXT'))
}

describe('OnboardingModal', () => {
  beforeEach(() => {
    setActivePlan.mockClear()
    plansState = {
      plans: [],
      activePlanId: null,
      setActivePlan,
    }
    useOnboardingUiStore.setState({ forceOpen: false })
  })

  it('is hidden when there is no signed-in user', () => {
    authState = { user: null }
    const { container } = render(<OnboardingModal />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the intro step when a signed-in user has no committed plan', () => {
    authState = { user: { uid: 'u1' } }
    render(<OnboardingModal />)
    expect(screen.getByText('INTRO_NEXT')).toBeTruthy()
  })

  it('stays hidden once a plan has a program and the modal was not force-opened', () => {
    authState = { user: { uid: 'u1' } }
    plansState = {
      ...plansState,
      plans: [{ id: 'plan-1', program: 'PROG1' }],
    }
    const { container } = render(<OnboardingModal />)
    expect(container.firstChild).toBeNull()
  })

  it('shows even with a committed plan when forceOpen is true (edit re-entry)', () => {
    useOnboardingUiStore.getState().open()
    authState = { user: { uid: 'u1' } }
    plansState = {
      ...plansState,
      plans: [{ id: 'plan-1', program: 'PROG1' }],
    }
    render(<OnboardingModal />)
    expect(screen.getByText('INTRO_NEXT')).toBeTruthy()
  })

  it('walks intro through every main step to plans hub on next()', () => {
    authState = { user: { uid: 'u1' } }
    render(<OnboardingModal />)
    walkToHub()
    expect(screen.getByText('HUB_NEXT')).toBeTruthy()
  })

  it('plans hub edit opens university and moves to program sub-flow', () => {
    authState = { user: { uid: 'u1' } }
    render(<OnboardingModal />)
    walkToHub()
    fireEvent.click(screen.getByText('HUB_EDIT_PLAN_2'))
    expect(setActivePlan).toHaveBeenCalledWith('plan-2')
    expect(screen.getByText('UNIVERSITY_NEXT')).toBeTruthy()
    fireEvent.click(screen.getByText('UNIVERSITY_NEXT'))
    expect(screen.getByText('PROGRAM_NEXT')).toBeTruthy()
  })

  it('program onNext returns to plans hub', () => {
    authState = { user: { uid: 'u1' } }
    render(<OnboardingModal />)
    walkToHub()
    fireEvent.click(screen.getByText('HUB_EDIT_PLAN_2'))
    fireEvent.click(screen.getByText('UNIVERSITY_NEXT'))
    fireEvent.click(screen.getByText('PROGRAM_NEXT'))
    expect(screen.getByText('HUB_NEXT')).toBeTruthy()
  })

  it('plans hub next closes forceOpen', () => {
    useOnboardingUiStore.getState().open()
    authState = { user: { uid: 'u1' } }
    render(<OnboardingModal />)
    walkToHub()
    fireEvent.click(screen.getByText('HUB_NEXT'))
    expect(useOnboardingUiStore.getState().forceOpen).toBe(false)
  })
})
