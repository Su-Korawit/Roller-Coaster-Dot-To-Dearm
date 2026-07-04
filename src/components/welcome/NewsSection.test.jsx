// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

const { default: NewsSection } = await import('./NewsSection')

describe('NewsSection', () => {
  beforeEach(() => navigate.mockClear())

  it('renders nothing when there is no news', () => {
    const { container } = render(<NewsSection news={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('clicking a card navigates to the full-screen post page instead of opening a popup', () => {
    render(<NewsSection news={[{ id: 'n1', titleTh: 'อัปเดต', bodyTh: 'รายละเอียดข่าว' }]} />)
    fireEvent.click(screen.getByText('อัปเดต'))
    expect(navigate).toHaveBeenCalledWith('/news/n1')
  })
})
