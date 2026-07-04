// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, renderHook } from '@testing-library/react'

const { useChatComposer } = await import('./useChatComposer')

function setViewportWidth(width) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
}

function TestComposer({ text, onSend }) {
  const { textareaRef, handleKeyDown } = useChatComposer(text, onSend)
  return <textarea ref={textareaRef} value={text} onChange={() => {}} onKeyDown={handleKeyDown} />
}

describe('useChatComposer', () => {
  afterEach(() => setViewportWidth(1024))

  it('desktop: Enter without Shift sends and prevents the default newline', () => {
    setViewportWidth(1024)
    const onSend = vi.fn()
    const { result } = renderHook(() => useChatComposer('hello', onSend))
    const preventDefault = vi.fn()
    result.current.handleKeyDown({ key: 'Enter', shiftKey: false, preventDefault })
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(preventDefault).toHaveBeenCalledTimes(1)
  })

  it('desktop: Shift+Enter does not send, leaving the default newline insertion intact', () => {
    setViewportWidth(1024)
    const onSend = vi.fn()
    const { result } = renderHook(() => useChatComposer('hello', onSend))
    const preventDefault = vi.fn()
    result.current.handleKeyDown({ key: 'Enter', shiftKey: true, preventDefault })
    expect(onSend).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('mobile: Enter never sends (with or without Shift), so it always inserts a newline', () => {
    setViewportWidth(375)
    const onSend = vi.fn()
    const { result } = renderHook(() => useChatComposer('hello', onSend))
    const preventDefault = vi.fn()
    result.current.handleKeyDown({ key: 'Enter', shiftKey: false, preventDefault })
    result.current.handleKeyDown({ key: 'Enter', shiftKey: true, preventDefault })
    expect(onSend).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('non-Enter keys are ignored', () => {
    setViewportWidth(1024)
    const onSend = vi.fn()
    const { result } = renderHook(() => useChatComposer('hello', onSend))
    result.current.handleKeyDown({ key: 'a', shiftKey: false, preventDefault: vi.fn() })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('auto-resizes the textarea height to fit content, capped at the max height', () => {
    setViewportWidth(1024)
    const onSend = vi.fn()
    const { rerender, getByRole } = render(<TestComposer text="" onSend={onSend} />)
    const textarea = getByRole('textbox')

    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 80 })
    rerender(<TestComposer text="hello" onSend={onSend} />)
    expect(textarea.style.height).toBe('80px')

    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 300 })
    rerender(<TestComposer text="hello\nworld\nmulti-line" onSend={onSend} />)
    expect(textarea.style.height).toBe('120px')
  })
})
