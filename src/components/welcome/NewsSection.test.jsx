// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

const { default: NewsSection } = await import('./NewsSection')

describe('NewsSection', () => {
  it('renders nothing when there is no news', () => {
    const { container } = render(<NewsSection news={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('links each card to the article on the content site', () => {
    render(<NewsSection news={[{ slug: 'exam-results', title: 'อัปเดต', excerpt: 'รายละเอียดข่าว', coverUrl: '' }]} />)
    const link = screen.getByRole('link', { name: /อัปเดต/ })
    expect(link.getAttribute('href')).toMatch(/\/blog\/exam-results/)
  })

  it('shows the excerpt and a cover when there is one', () => {
    render(<NewsSection news={[{ slug: 'a-1', title: 'หัวข้อ', excerpt: 'คำโปรย', coverUrl: 'https://x.org/c.png' }]} />)
    expect(screen.getByText('คำโปรย')).toBeTruthy()
  })
})
