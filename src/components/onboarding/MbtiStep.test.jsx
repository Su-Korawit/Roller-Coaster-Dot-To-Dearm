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

const { default: MbtiStep } = await import('./MbtiStep')

describe('MbtiStep', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { mbti: null, setMbti: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('renders all MBTI characters in a grid', () => {
    render(<MbtiStep onNext={() => {}} onBack={() => {}} />)
    expect(screen.getByRole('button', { name: /INTJ/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /ENFP/i })).toBeTruthy()
  })

  it('selects a card and enables next', () => {
    const onNext = vi.fn()
    render(<MbtiStep onNext={onNext} onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /INTJ/i }))
    expect(selectState.setMbti).toHaveBeenCalled()
    fireEvent.click(screen.getByText('ถัดไป'))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
})
