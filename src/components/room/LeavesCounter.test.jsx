// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const state = vi.hoisted(() => ({ leaves: 0 }))
vi.mock('../../stores/useLeavesStore', () => ({ useLeavesStore: (sel) => sel(state) }))

const { default: LeavesCounter } = await import('./LeavesCounter')

beforeEach(() => { state.leaves = 0 })

describe('LeavesCounter', () => {
  it('shows the balance with an accessible label', () => {
    state.leaves = 127
    render(<LeavesCounter />)
    expect(screen.getByLabelText('ใบไม้ 127 ใบ')).toBeTruthy()
    expect(screen.getByText('127')).toBeTruthy()
  })

  it('shows zero for a new account', () => {
    render(<LeavesCounter />)
    expect(screen.getByText('0')).toBeTruthy()
  })

  it('groups thousands so large balances stay readable', () => {
    state.leaves = 12345
    render(<LeavesCounter />)
    expect(screen.getByText('12,345')).toBeTruthy()
  })
})
