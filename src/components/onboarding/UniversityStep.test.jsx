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

vi.mock('../../utils/cloudAsset', () => ({
  cloudAsset: vi.fn().mockResolvedValue(null),
}))

const { default: UniversityStep } = await import('./UniversityStep')

describe('UniversityStep', () => {
  beforeEach(() => {
    authState = { user: { uid: 'u1' } }
    plansState = {
      plans: [{ id: 'p1', university: null, program: null, addedAt: 1 }],
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

  it('selecting a university updates active plan and syncs to Firestore', () => {
    render(<UniversityStep onNext={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('จุฬาลงกรณ์'))
    expect(plansState.updatePlan).toHaveBeenCalledWith('p1', { university: 'CU' })
    expect(syncSelectToFirestore).toHaveBeenCalledWith('u1')
  })
})
