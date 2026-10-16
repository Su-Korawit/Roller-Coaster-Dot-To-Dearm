// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

let paramsId
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: paramsId }) }))

const { default: NewsPostPage } = await import('./NewsPostPage')

const realLocation = window.location
const replace = vi.fn()

beforeEach(() => {
  replace.mockClear()
  paramsId = 'n1'
  Object.defineProperty(window, 'location', { value: { replace }, writable: true, configurable: true })
})
afterEach(() => {
  Object.defineProperty(window, 'location', { value: realLocation, writable: true, configurable: true })
})

describe('NewsPostPage (legacy news URL)', () => {
  it('sends the reader to the same article on the content site', () => {
    render(<NewsPostPage />)
    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/blog/n1?site=hub')
  })

  it('shows a short message while redirecting', () => {
    render(<NewsPostPage />)
    expect(screen.getByText(/กำลังพาไปยังบทความ/)).toBeTruthy()
  })

  it('encodes unusual ids', () => {
    paramsId = 'a b'
    render(<NewsPostPage />)
    expect(replace).toHaveBeenCalledWith('/blog/a%20b?site=hub')
  })
})
