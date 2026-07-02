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

vi.mock('../hooks/useMytcas', () => ({
  useTcasFaculties: () => ({
    faculties: [{ faculty_id: 'F1', faculty_name_th: 'วิศวกรรมศาสตร์', program_count: 1 }],
    loading: false,
    error: null,
  }),
  useTcasPrograms: () => ({
    programs: [
      { _id: 'P1', program_id: 'PROG1', program_name_th: 'วิศวกรรมคอมพิวเตอร์', field_name_th: '', program_type_name_th: 'ปกติ' },
    ],
    loading: false,
    error: null,
  }),
  useTcasRounds: () => ({ rounds: [] }),
}))

const { default: ProgramPage } = await import('./ProgramPage')

describe('ProgramPage', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    selectState = { university: 'CU', program: null, setProgram: vi.fn() }
    syncSelectToFirestore.mockClear()
  })

  it('selecting a faculty then a program sets it and syncs to Firestore', () => {
    render(<MemoryRouter><ProgramPage /></MemoryRouter>)
    fireEvent.click(screen.getByText('วิศวกรรมศาสตร์'))
    fireEvent.click(screen.getByText('วิศวกรรมคอมพิวเตอร์'))
    expect(selectState.setProgram).toHaveBeenCalledWith('PROG1')
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })
})
