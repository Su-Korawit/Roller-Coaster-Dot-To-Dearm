// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { resetStore, fakeStoreHook, summary, renderAt } from './testUtils'

vi.mock('../../stores/useArticlesStore', () => ({ useArticlesStore: (sel) => fakeStoreHook(sel) }))
vi.mock('../../components/landing/SiteFooter', () => ({ default: () => <footer /> }))

const { default: CategoryPage } = await import('./CategoryPage')
const show = (cat) =>
  renderAt(
    `/category/${cat}`,
    [
      ['/category/:cat', <CategoryPage key="c" />],
      ['/', <p key="home">HOME</p>],
    ],
    render,
  )

beforeEach(() => resetStore())

describe('CategoryPage', () => {
  it('lists only the articles of that category, newest first', () => {
    resetStore({
      summaries: [
        summary('old', { category: 'guide', publishedAt: '2026-01-01T00:00:00.000Z' }),
        summary('new', { category: 'guide', publishedAt: '2026-10-01T00:00:00.000Z' }),
        summary('news1', { category: 'news' }),
      ],
    })
    show('guide')
    expect(screen.getByRole('heading', { level: 1, name: 'แนะแนวเลือกคณะ' })).toBeTruthy()
    const links = screen.getAllByRole('link', { name: /บทความ (old|new)/ })
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/blog/new', '/blog/old'])
    expect(screen.queryByRole('link', { name: /news1/ })).toBeNull()
  })

  it('shows 12 at a time with a load-more button', () => {
    resetStore({
      summaries: Array.from({ length: 15 }, (_, i) =>
        summary(`a${i}`, { category: 'news', publishedAt: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` }),
      ),
    })
    show('news')
    expect(screen.getAllByRole('link', { name: /บทความ a/ })).toHaveLength(12)
    fireEvent.click(screen.getByRole('button', { name: 'โหลดเพิ่ม' }))
    expect(screen.getAllByRole('link', { name: /บทความ a/ })).toHaveLength(15)
    expect(screen.queryByRole('button', { name: 'โหลดเพิ่ม' })).toBeNull()
  })

  it('shows an empty state for a category with no articles', () => {
    show('camps')
    expect(screen.getByText(/ยังไม่มีบทความในหมวดนี้/)).toBeTruthy()
  })

  it('redirects an unknown category to the home page', () => {
    show('sports')
    expect(screen.getByText('HOME')).toBeTruthy()
  })
})
