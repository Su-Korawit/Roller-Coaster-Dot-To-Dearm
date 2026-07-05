// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PlansHub from './PlansHub'
import { usePlansStore } from '../../stores/usePlansStore'

describe('PlansHub', () => {
  beforeEach(() => usePlansStore.getState().resetPlans())

  it('shows an empty state and an add button', () => {
    render(<PlansHub onEditPlan={() => {}} onNext={() => {}} onBack={() => {}} />)
    expect(screen.getByRole('button', { name: /add|เพิ่ม|\+/i })).toBeTruthy()
    expect(screen.getByText(/ยังไม่มีแผน/i)).toBeTruthy()
  })

  it('adds a plan and opens its editor', () => {
    const onEditPlan = vi.fn()
    render(<PlansHub onEditPlan={onEditPlan} onNext={() => {}} onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /add|เพิ่ม|\+/i }))
    expect(usePlansStore.getState().plans).toHaveLength(1)
    expect(onEditPlan).toHaveBeenCalledWith(usePlansStore.getState().plans[0].id)
  })

  it('renders a card per plan and can delete one', () => {
    const planId = usePlansStore.getState().addPlan()
    usePlansStore.getState().updatePlan(planId, { university: 'CU', program: 'PROG1' })
    render(<PlansHub onEditPlan={() => {}} onNext={() => {}} onBack={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /delete|ลบ|remove/i }))
    expect(usePlansStore.getState().plans).toHaveLength(0)
  })
})
