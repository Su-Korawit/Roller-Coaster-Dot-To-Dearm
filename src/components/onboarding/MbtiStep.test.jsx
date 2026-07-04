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

  it('selecting the current MBTI type sets it, syncs, and calls onNext', () => {
    const onNext = vi.fn()
    render(<MbtiStep onNext={onNext} />)
    fireEvent.click(screen.getByRole('button', { name: /^Select / }))
    expect(selectState.setMbti).toHaveBeenCalled()
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
    expect(onNext).toHaveBeenCalledTimes(1)
  })
})
