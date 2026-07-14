// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRoadmapShortcuts } from './useRoadmapShortcuts'

function fireKey(key, opts = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, cancelable: true, ...opts }))
}

describe('useRoadmapShortcuts', () => {
  let onDuplicate, onCopy, onPaste
  beforeEach(() => {
    onDuplicate = vi.fn()
    onCopy = vi.fn()
    onPaste = vi.fn()
    document.body.innerHTML = ''
  })

  it('Ctrl/Cmd+D calls onDuplicate', () => {
    renderHook(() => useRoadmapShortcuts({ enabled: true, hasSelection: true, onDuplicate, onCopy, onPaste }))
    fireKey('d')
    expect(onDuplicate).toHaveBeenCalledTimes(1)
  })

  it('Ctrl/Cmd+C calls onCopy only when something is selected', () => {
    const { rerender } = renderHook(
      ({ hasSelection }) => useRoadmapShortcuts({ enabled: true, hasSelection, onDuplicate, onCopy, onPaste }),
      { initialProps: { hasSelection: false } },
    )
    fireKey('c')
    expect(onCopy).not.toHaveBeenCalled()
    rerender({ hasSelection: true })
    fireKey('c')
    expect(onCopy).toHaveBeenCalledTimes(1)
  })

  it('Ctrl/Cmd+V calls onPaste', () => {
    renderHook(() => useRoadmapShortcuts({ enabled: true, hasSelection: false, onDuplicate, onCopy, onPaste }))
    fireKey('v')
    expect(onPaste).toHaveBeenCalledTimes(1)
  })

  it('is a no-op while focus is inside a text input (normal text copy/paste keeps working)', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    renderHook(() => useRoadmapShortcuts({ enabled: true, hasSelection: true, onDuplicate, onCopy, onPaste }))
    fireKey('d')
    fireKey('c')
    fireKey('v')
    expect(onDuplicate).not.toHaveBeenCalled()
    expect(onCopy).not.toHaveBeenCalled()
    expect(onPaste).not.toHaveBeenCalled()
  })

  it('is a no-op when disabled (view-only sheet)', () => {
    renderHook(() => useRoadmapShortcuts({ enabled: false, hasSelection: true, onDuplicate, onCopy, onPaste }))
    fireKey('d')
    expect(onDuplicate).not.toHaveBeenCalled()
  })

  it('ignores keydown without Ctrl/Cmd held', () => {
    renderHook(() => useRoadmapShortcuts({ enabled: true, hasSelection: true, onDuplicate, onCopy, onPaste }))
    fireKey('d', { ctrlKey: false })
    expect(onDuplicate).not.toHaveBeenCalled()
  })
})
