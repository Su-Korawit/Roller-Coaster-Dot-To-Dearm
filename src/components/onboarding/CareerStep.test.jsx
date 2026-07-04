// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let selectState
vi.mock('../../stores/useSelectStore', () => ({
  useSelectStore: (sel) => sel(selectState),
}))

let authState
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: { getState: () => authState },
}))

const syncSelectToFirestore = vi.fn()
vi.mock('../../utils/syncSelectToFirestore', () => ({
  syncSelectToFirestore: (...args) => syncSelectToFirestore(...args),
}))

vi.mock('../../data/onboardingData', () => ({
  careers: [
    { id: 'c1', name: 'Test Career One', detail: 'Detail one', mbti: [], keywords: [] },
    { id: 'c2', name: 'Test Career Two', detail: 'Detail two', mbti: [], keywords: [] },
  ],
}))

const { default: CareerStep } = await import('./CareerStep')

describe('CareerStep', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { mbti: null, career: null, setCareer: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('selecting a career card sets it and syncs to Firestore', () => {
    render(<CareerStep onNext={vi.fn()} />)
    const [firstCard] = screen.getAllByRole('option')
    fireEvent.click(firstCard)
    expect(selectState.setCareer).toHaveBeenCalled()
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })
})
