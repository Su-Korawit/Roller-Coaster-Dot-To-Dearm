// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PlanList from './PlanList'
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

describe('PlanList', () => {
  beforeEach(() => {
    mockSync.mockClear()
    usePlansStore.getState().resetPlans()
  })

  it('shows progress ring and add FAB', () => {
    render(<PlanList onEditPlan={() => {}} onNext={() => {}} onBack={() => {}} />)
    expect(screen.getByRole('button', { name: /add plan/i })).toBeTruthy()
    expect(screen.getByText('0/14')).toBeTruthy()
  })

  it('adds a plan and opens its editor', () => {
    const onEditPlan = vi.fn()
    render(<PlanList onEditPlan={onEditPlan} onNext={() => {}} onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /add plan/i }))
    expect(usePlansStore.getState().plans).toHaveLength(1)
    expect(onEditPlan).toHaveBeenCalledWith(usePlansStore.getState().plans[0].id)
  })

  it('deletes a plan', () => {
    usePlansStore.getState().addPlan()
    render(<PlanList onEditPlan={() => {}} onNext={() => {}} onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /ลบแผน/i }))
    expect(usePlansStore.getState().plans).toHaveLength(0)
  })

  it('syncs active plan to Firestore when finishing', async () => {
    usePlansStore.getState().addPlan()
    const onNext = vi.fn()
    render(<PlanList onEditPlan={() => {}} onNext={onNext} onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /เสร็จสิ้น/i }))
    await vi.waitFor(() => {
      expect(mockSync).toHaveBeenCalledWith('u1')
    })
    expect(onNext).toHaveBeenCalledOnce()
  })
})
