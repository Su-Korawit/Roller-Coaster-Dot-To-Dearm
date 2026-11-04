// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PxIcon from './PxIcon'

describe('PxIcon', () => {
  it('renders size × scale pixels by default (20 × 2)', () => {
    const { container } = render(<PxIcon src="/a.png" />)
    const img = container.querySelector('img')
    expect(img.getAttribute('width')).toBe('40')
    expect(img.getAttribute('height')).toBe('40')
  })

  it('honours custom size and scale', () => {
    const { container } = render(<PxIcon src="/a.png" size={16} scale={3} />)
    expect(container.querySelector('img').getAttribute('width')).toBe('48')
  })

  it('renders crisp pixels and is not draggable', () => {
    const img = render(<PxIcon src="/a.png" />).container.querySelector('img')
    expect(img.style.imageRendering).toBe('pixelated')
    expect(img.getAttribute('draggable')).toBe('false')
  })

  it('is decorative (aria-hidden) when alt is empty', () => {
    const img = render(<PxIcon src="/a.png" />).container.querySelector('img')
    expect(img.getAttribute('aria-hidden')).toBe('true')
    expect(img.getAttribute('alt')).toBe('')
  })

  it('is exposed to assistive tech when alt is given', () => {
    const img = render(<PxIcon src="/a.png" alt="Focus" />).container.querySelector('img')
    expect(img.getAttribute('aria-hidden')).toBeNull()
    expect(img.getAttribute('alt')).toBe('Focus')
  })
})
