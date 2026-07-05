// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLongPressDrag } from './useLongPressDrag'

describe('useLongPressDrag', () => {
  it('ignores mouse pointers entirely (desktop uses HTML5 drag-and-drop instead)', () => {
    const onDrop = vi.fn()
    const { result } = renderHook(() => useLongPressDrag(onDrop))
    act(() => {
      result.current.getHandlers('process').onPointerDown({ pointerType: 'mouse', clientX: 10, clientY: 10 })
    })
    expect(result.current.dragState).toBeNull()
  })

  it('starts idle with no drag in progress', () => {
    const { result } = renderHook(() => useLongPressDrag(vi.fn()))
    expect(result.current.dragState).toBeNull()
  })

  it('a touch pointer released before the long-press timer fires does not call onDrop', () => {
    vi.useFakeTimers()
    const onDrop = vi.fn()
    const { result } = renderHook(() => useLongPressDrag(onDrop))
    const target = { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() }
    act(() => {
      result.current.getHandlers('process').onPointerDown({ pointerType: 'touch', pointerId: 1, clientX: 10, clientY: 10, currentTarget: target })
    })
    act(() => {
      result.current.getHandlers('process').onPointerUp({ pointerType: 'touch', pointerId: 1, clientX: 10, clientY: 10, currentTarget: target, preventDefault: vi.fn() })
    })
    expect(onDrop).not.toHaveBeenCalled()
    expect(result.current.dragState).toBeNull()
    vi.useRealTimers()
  })

  it('a touch pointer held past 500ms starts a drag, and releasing it calls onDrop with the drop point', () => {
    vi.useFakeTimers()
    const onDrop = vi.fn()
    const { result } = renderHook(() => useLongPressDrag(onDrop))
    const target = { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() }
    act(() => {
      result.current.getHandlers('image').onPointerDown({ pointerType: 'touch', pointerId: 1, clientX: 10, clientY: 20, currentTarget: target })
    })
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.dragState).toEqual({ type: 'image', x: 10, y: 20 })
    act(() => {
      result.current.getHandlers('image').onPointerMove({ pointerType: 'touch', pointerId: 1, clientX: 30, clientY: 40 })
    })
    expect(result.current.dragState).toEqual({ type: 'image', x: 30, y: 40 })
    act(() => {
      result.current.getHandlers('image').onPointerUp({ pointerType: 'touch', pointerId: 1, clientX: 30, clientY: 40, currentTarget: target, preventDefault: vi.fn() })
    })
    expect(onDrop).toHaveBeenCalledWith('image', { clientX: 30, clientY: 40 })
    expect(result.current.dragState).toBeNull()
    vi.useRealTimers()
  })
})
