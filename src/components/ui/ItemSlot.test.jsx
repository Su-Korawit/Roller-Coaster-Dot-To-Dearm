// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ItemSlot from './ItemSlot'

const base = { icon: '/focus.png', label: 'โฟกัส' }

describe('ItemSlot', () => {
  it('is a button named by its label', () => {
    render(<ItemSlot {...base} />)
    const b = screen.getByRole('button', { name: 'โฟกัส' })
    expect(b.getAttribute('type')).toBe('button')
    expect(b.getAttribute('title')).toBe('โฟกัส')
  })

  it('reflects selection with aria-pressed and the lifted style', () => {
    const { rerender } = render(<ItemSlot {...base} selected={false} />)
    let b = screen.getByRole('button')
    expect(b.getAttribute('aria-pressed')).toBe('false')
    expect(b.className).toContain('border-hairline')
    rerender(<ItemSlot {...base} selected />)
    b = screen.getByRole('button')
    expect(b.getAttribute('aria-pressed')).toBe('true')
    for (const c of ['-translate-y-1', 'shadow-px', 'border-line', 'bg-paper', 'rounded-slot']) {
      expect(b.className).toContain(c)
    }
  })

  it('shows the hotkey when given', () => {
    render(<ItemSlot {...base} hotkey="3" />)
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('shows a badge for a positive count only', () => {
    const { rerender } = render(<ItemSlot {...base} badge={2} />)
    expect(screen.getByRole('button').textContent).toContain('2')
    rerender(<ItemSlot {...base} badge={0} />)
    expect(screen.getByRole('button').querySelector('span.bg-danger')).toBeNull()
  })

  it('calls onClick once per click', () => {
    const onClick = vi.fn()
    render(<ItemSlot {...base} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders its icon as a decorative pixel image', () => {
    const { container } = render(<ItemSlot {...base} />)
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toBe('/focus.png')
    expect(img.getAttribute('aria-hidden')).toBe('true')
  })
})
