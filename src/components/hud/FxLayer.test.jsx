// @vitest-environment jsdom
import { render, screen, act, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import FxLayer from './FxLayer'
import { useFxStore, TOAST_MS } from '../../stores/useFxStore'

beforeEach(() => { vi.useFakeTimers(); useFxStore.getState().clear() })
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('FxLayer', () => {
  it('renders nothing while there are no toasts', () => {
    const { container } = render(<FxLayer />)
    expect(container.innerHTML).toBe('')
  })

  it('shows XP and level-up toasts in a polite, non-interactive live region, then clears them', () => {
    render(<FxLayer />)
    act(() => {
      useFxStore.getState().push({ kind: 'xp', text: '+25 XP' })
      useFxStore.getState().push({ kind: 'levelup', text: 'LEVEL UP! Lv 3' })
    })
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.className).toContain('pointer-events-none')
    expect(screen.getByTestId('fx-xp').textContent).toBe('+25 XP')
    expect(screen.getByTestId('fx-levelup').textContent).toContain('LEVEL UP! Lv 3')

    act(() => { vi.advanceTimersByTime(TOAST_MS + 1) })
    expect(screen.queryByRole('status')).toBeNull()
  })
})
