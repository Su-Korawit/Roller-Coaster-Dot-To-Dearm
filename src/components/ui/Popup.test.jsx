// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Popup from './Popup'
import { usePopupStore } from '../../stores/usePopupStore'

describe('Popup', () => {
  it('renders children', () => {
    render(<Popup onClose={() => {}}><p>hello</p></Popup>)
    expect(screen.getByText('hello')).toBeTruthy()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<Popup onClose={onClose}><p>x</p></Popup>)
    fireEvent.click(container.querySelector('[aria-hidden="true"]'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when the card body is clicked', () => {
    const onClose = vi.fn()
    render(<Popup onClose={onClose}><p>body</p></Popup>)
    fireEvent.click(screen.getByText('body'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('applies the size max-width class', () => {
    render(<Popup size="lg" onClose={() => {}}><p>x</p></Popup>)
    expect(document.querySelector('.max-w-2xl')).toBeTruthy()
  })

  it('sheet variant adds nav-safe bottom padding by default', () => {
    render(<Popup variant="sheet" onClose={() => {}}><p>x</p></Popup>)
    expect(document.querySelector('.px-sheet')).toBeTruthy()
    expect(document.body.innerHTML).toContain('safe-area-inset-bottom')
  })

  it('registers its id in usePopupStore while mounted', () => {
    usePopupStore.getState().close()
    const { unmount } = render(<Popup id="demo" onClose={() => {}}><p>x</p></Popup>)
    expect(usePopupStore.getState().activePopup).toBe('demo')
    unmount()
    expect(usePopupStore.getState().activePopup).toBeNull()
  })
})
