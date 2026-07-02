// src/pages/CareerPage.test.jsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

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

const { default: CareerPage } = await import('./CareerPage')

describe('CareerPage', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { mbti: null, career: null, setCareer: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('selecting a career card sets it and syncs to Firestore', () => {
    render(<MemoryRouter><CareerPage /></MemoryRouter>)
    const [firstCard] = screen.getAllByRole('option')
    fireEvent.click(firstCard)
    expect(selectState.setCareer).toHaveBeenCalled()
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })
})
