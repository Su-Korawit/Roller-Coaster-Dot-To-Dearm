// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PlansHub from './PlansHub'
import { usePlansStore } from '../../stores/usePlansStore'

const mockSync = vi.fn(() => Promise.resolve())
vi.mock('../../utils/syncSelectToFirestore', () => ({
  syncSelectToFirestore: (...args) => mockSync(...args),
}))
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel({ user: { uid: 'u1' } }),
}))
vi.mock('../../hooks/useMytcas', () => ({
  useTcasRounds: () => ({ rounds: [] }),
  tcasLogoUrl: () => '',
}))

describe('PlansHub', () => {
  beforeEach(() => {
    mockSync.mockClear()
    usePlansStore.getState().resetPlans()
  })

  it('shows an empty state and an add button', () => {
    render(<PlansHub onEditPlan={() => {}} onNext={() => {}} onBack={() => {}} />)
    expect(screen.getByRole('button', { name: /add plan/i })).toBeTruthy()
    expect(screen.getByText(/ยังไม่มีแผน/i)).toBeTruthy()
  })

  it('adds a plan and opens its editor', () => {
    const onEditPlan = vi.fn()
    render(<PlansHub onEditPlan={onEditPlan} onNext={() => {}} onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /add plan/i }))
    expect(usePlansStore.getState().plans).toHaveLength(1)
    expect(onEditPlan).toHaveBeenCalledWith(usePlansStore.getState().plans[0].id)
  })

  it('renders a card per plan and can delete one', () => {
    const planId = usePlansStore.getState().addPlan()
    usePlansStore.getState().updatePlan(planId, { university: 'CU', program: 'PROG1' })
    render(<PlansHub onEditPlan={() => {}} onNext={() => {}} onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /ลบแผน/i }))
    expect(usePlansStore.getState().plans).toHaveLength(0)
  })

  it('syncs active plan to Firestore when finishing the hub', async () => {
    usePlansStore.getState().addPlan()
    const onNext = vi.fn()
    render(<PlansHub onEditPlan={() => {}} onNext={onNext} onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /เสร็จสิ้น/i }))
    await vi.waitFor(() => {
      expect(mockSync).toHaveBeenCalledWith('u1')
    })
    expect(onNext).toHaveBeenCalledOnce()
  })
})
