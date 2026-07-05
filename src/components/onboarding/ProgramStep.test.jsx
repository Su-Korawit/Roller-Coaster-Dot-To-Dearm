// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

let plansState
const usePlansStore = vi.fn((sel) => sel(plansState))
vi.mock('../../stores/usePlansStore', () => ({
  usePlansStore: (sel) => usePlansStore(sel),
}))

let authState
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel(authState),
}))

const syncSelectToFirestore = vi.fn()
vi.mock('../../utils/syncSelectToFirestore', () => ({
  syncSelectToFirestore: (...args) => syncSelectToFirestore(...args),
}))

vi.mock('../../hooks/useMytcas', () => ({
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

const { default: ProgramStep } = await import('./ProgramStep')

describe('ProgramStep', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    plansState = {
      plans: [{ id: 'p1', university: 'CU', program: null, addedAt: 1 }],
      activePlanId: 'p1',
      updatePlan: vi.fn((id, patch) => {
        plansState = {
          ...plansState,
          plans: plansState.plans.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan)),
        }
      }),
    }
    syncSelectToFirestore.mockClear()
    usePlansStore.mockClear()
  })

  it('selecting a faculty then a program updates active plan and syncs to Firestore', () => {
    render(<ProgramStep onNext={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByText('วิศวกรรมศาสตร์'))
    fireEvent.click(screen.getByText('วิศวกรรมคอมพิวเตอร์'))
    expect(plansState.updatePlan).toHaveBeenCalledWith('p1', { program: 'PROG1' })
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })

  it('falls back to onBack when no university is selected yet', () => {
    plansState = {
      plans: [{ id: 'p1', university: null, program: null, addedAt: 1 }],
      activePlanId: 'p1',
      updatePlan: vi.fn(),
    }
    const onBack = vi.fn()
    render(<ProgramStep onNext={vi.fn()} onBack={onBack} />)
    fireEvent.click(screen.getByText('ไปเลือกมหาวิทยาลัย'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
