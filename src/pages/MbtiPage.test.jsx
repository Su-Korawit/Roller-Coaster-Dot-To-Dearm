// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

let selectState
vi.mock('../stores/useSelectStore', () => ({
  useSelectStore: (sel) => sel(selectState),
}))

let authState
vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: { getState: () => authState },
}))

const syncSelectToFirestore = vi.fn()
vi.mock('../utils/syncSelectToFirestore', () => ({
  syncSelectToFirestore: (...args) => syncSelectToFirestore(...args),
}))

const { default: MbtiPage } = await import('./MbtiPage')

describe('MbtiPage', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { mbti: null, setMbti: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('selecting the current MBTI type sets it, syncs, and navigates to /select/career', () => {
    render(
      <MemoryRouter initialEntries={['/select/mbti']}>
        <Routes>
          <Route path="/select/mbti" element={<MbtiPage />} />
          <Route path="/select/career" element={<div>CAREER</div>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /^Select / }))
    expect(selectState.setMbti).toHaveBeenCalled()
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
    expect(screen.getByText('CAREER')).toBeTruthy()
  })
})
