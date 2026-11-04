// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import WarpTransition from './WarpTransition'

const setReduced = (on) => {
  window.matchMedia = (q) => ({ matches: on && q.includes('reduce'), addEventListener() {}, removeEventListener() {} })
}

afterEach(() => { vi.useRealTimers() })

describe('WarpTransition', () => {
  it('renders nothing while idle', () => {
    setReduced(false)
    const { container } = render(<WarpTransition active={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows an iris while a map loads and never takes clicks', () => {
    setReduced(false)
    const { container } = render(<WarpTransition active />)
    const el = container.firstChild
    expect(el.getAttribute('data-warp')).toBe('iris')
    expect(el.className).toContain('pointer-events-none')
    expect(el.getAttribute('aria-hidden')).toBe('true')
  })

  it('uses a plain fade under reduced motion', () => {
    setReduced(true)
    const { container } = render(<WarpTransition active />)
    expect(container.firstChild.getAttribute('data-warp')).toBe('fade')
  })

  it('removes itself shortly after loading ends (no stuck screen after a failed load)', () => {
    setReduced(false)
    vi.useFakeTimers()
    const { container, rerender } = render(<WarpTransition active />)
    rerender(<WarpTransition active={false} />)
    expect(container.firstChild).not.toBeNull()
    act(() => { vi.advanceTimersByTime(500) })
    expect(container.firstChild).toBeNull()
  })
})
