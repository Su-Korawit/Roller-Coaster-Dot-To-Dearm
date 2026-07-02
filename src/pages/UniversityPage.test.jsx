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

vi.mock('../hooks/useSelectionCommit', () => ({
  useSelectionCommit: (setter) => (value) => {
    setter(value)
    syncSelectToFirestore(authState.user?.uid)
  },
}))

vi.mock('../hooks/useMytcas', () => ({
  useTcasUniversities: () => ({
    universities: [
      { university_id: 'CU', university_name_th: 'จุฬาลงกรณ์', university_name_en: 'Chulalongkorn', logo_url: null },
    ],
    total: 1,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

vi.mock('../utils/cloudAsset', () => ({
  cloudAsset: vi.fn().mockResolvedValue(null),
}))

const { default: UniversityPage } = await import('./UniversityPage')

describe('UniversityPage', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { university: null, setUniversity: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('selecting a university sets it and syncs to Firestore', () => {
    render(<MemoryRouter><UniversityPage /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText('จุฬาลงกรณ์'))
    expect(selectState.setUniversity).toHaveBeenCalledWith('CU')
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })
})
