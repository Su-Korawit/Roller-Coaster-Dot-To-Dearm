// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let authState
const useAuthStoreMock = Object.assign((sel) => sel(authState), {
  getState: () => authState,
})
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: useAuthStoreMock,
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
vi.mock('./PlanList', () => ({
  default: ({ onEditPlan, onNext, onBack }) => (
    <>
      <button onClick={() => onEditPlan('plan-2')}>LIST_EDIT_PLAN_2</button>
      <button onClick={onNext}>LIST_NEXT</button>
      <button onClick={onBack}>LIST_BACK</button>
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

function walkToPlanList() {
  fireEvent.click(screen.getByText('INTRO_NEXT'))
  fireEvent.click(screen.getByText('MBTI_NEXT'))
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

  it('renders a full-screen overlay when visible', () => {
    authState = { user: { uid: 'u1' } }
    const { container } = render(<OnboardingModal />)
    expect(container.querySelector('.fixed.inset-0')).toBeTruthy()
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

  it('opens plan list directly when forceOpen is true (edit re-entry)', () => {
    useOnboardingUiStore.getState().open()
    authState = { user: { uid: 'u1' } }
    plansState = {
      ...plansState,
      plans: [{ id: 'plan-1', program: 'PROG1' }],
    }
    render(<OnboardingModal />)
    expect(screen.getByText('LIST_NEXT')).toBeTruthy()
    expect(screen.queryByText('INTRO_NEXT')).toBeNull()
  })

  it('walks intro through every main step to plan list on next()', () => {
    authState = { user: { uid: 'u1' } }
    render(<OnboardingModal />)
    walkToPlanList()
    expect(screen.getByText('LIST_NEXT')).toBeTruthy()
  })

  it('plan list edit opens university and moves to program sub-flow', () => {
    authState = { user: { uid: 'u1' } }
    render(<OnboardingModal />)
    walkToPlanList()
    fireEvent.click(screen.getByText('LIST_EDIT_PLAN_2'))
    expect(setActivePlan).toHaveBeenCalledWith('plan-2')
    expect(screen.getByText('UNIVERSITY_NEXT')).toBeTruthy()
    fireEvent.click(screen.getByText('UNIVERSITY_NEXT'))
    expect(screen.getByText('PROGRAM_NEXT')).toBeTruthy()
  })

  it('program onNext returns to plan list', () => {
    authState = { user: { uid: 'u1' } }
    render(<OnboardingModal />)
    walkToPlanList()
    fireEvent.click(screen.getByText('LIST_EDIT_PLAN_2'))
    fireEvent.click(screen.getByText('UNIVERSITY_NEXT'))
    fireEvent.click(screen.getByText('PROGRAM_NEXT'))
    expect(screen.getByText('LIST_NEXT')).toBeTruthy()
  })

  it('plan list next closes forceOpen', () => {
    useOnboardingUiStore.getState().open()
    authState = { user: { uid: 'u1' } }
    plansState = {
      ...plansState,
      plans: [{ id: 'plan-1', program: 'PROG1' }],
    }
    render(<OnboardingModal />)
    fireEvent.click(screen.getByText('LIST_NEXT'))
    expect(useOnboardingUiStore.getState().forceOpen).toBe(false)
  })
})
