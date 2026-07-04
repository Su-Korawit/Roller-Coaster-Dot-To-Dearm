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

const { default: MasteryStep } = await import('./MasteryStep')

describe('MasteryStep', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { career: null, mastery: null, setMastery: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('selecting a mastery card sets it and syncs to Firestore', () => {
    render(<MasteryStep onNext={vi.fn()} />)
    const [firstCard] = screen.getAllByRole('option')
    fireEvent.click(firstCard)
    expect(selectState.setMastery).toHaveBeenCalled()
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })
})
