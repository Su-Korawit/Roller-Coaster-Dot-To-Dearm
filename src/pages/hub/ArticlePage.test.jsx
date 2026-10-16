// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { storeState, resetStore, fakeStoreHook, summary, renderAt } from './testUtils'

vi.mock('../../stores/useArticlesStore', () => ({ useArticlesStore: (sel) => fakeStoreHook(sel) }))
vi.mock('../../components/landing/SiteFooter', () => ({ default: () => <footer /> }))

const { default: ArticlePage } = await import('./ArticlePage')
const show = (slug = 'medicine-all') => renderAt(`/blog/${slug}`, [['/blog/:slug', <ArticlePage key="a" />]], render)

const body = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'ภาพรวมโครงการ' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'ข้อความ <script>alert(1)</script>' }] },
  ],
})
const article = (over = {}) => ({
  slug: 'medicine-all',
  title: 'ทุกโครงการแพทย์',
  excerpt: 'สรุป',
  category: 'compare',
  coverUrl: 'https://x.org/c.png',
  coverAlt: 'ภาพปก',
  authorName: 'มายด์',
  publishedAt: '2026-10-01T03:00:00.000Z',
  readingMinutes: 4,
  body,
  ...over,
})

beforeEach(() => resetStore())

describe('ArticlePage', () => {
  it('shows title, author, reading time, body headings, cover alt and the call-to-action', async () => {
    resetStore({ summaries: [summary('other', { category: 'compare' })] })
    storeState.loadArticle.mockResolvedValue(article())
    show()
    expect(await screen.findByRole('heading', { level: 1, name: 'ทุกโครงการแพทย์' })).toBeTruthy()
    expect(screen.getByText(/มายด์/)).toBeTruthy()
    expect(screen.getByText(/4 นาที/)).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'ภาพรวมโครงการ' })).toBeTruthy()
    expect(screen.getByAltText('ภาพปก')).toBeTruthy()
    const app = screen.getByRole('link', { name: /เปิดแอป/ })
    expect(app.getAttribute('href')).toContain('utm_medium=article')
    expect(app.getAttribute('href')).toContain('utm_campaign=medicine-all')
  })

  it('renders the body through the safe renderer (no script element)', async () => {
    storeState.loadArticle.mockResolvedValue(article())
    const { container } = show()
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector('.article-body script')).toBeNull()
    expect(container.querySelector('.article-body').textContent).toContain('<script>alert(1)</script>')
  })

  it('sets the document title', async () => {
    storeState.loadArticle.mockResolvedValue(article())
    show()
    await waitFor(() => expect(document.title).toBe('ทุกโครงการแพทย์ | I LOVE TCAS'))
  })

  it('shows related articles and the OpenChat link when configured', async () => {
    resetStore({
      summaries: [summary('r1', { category: 'compare' })],
      config: { lineOpenChatUrl: 'https://line.me/ti/g2/abc' },
    })
    storeState.loadArticle.mockResolvedValue(article())
    show()
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByRole('link', { name: /บทความ r1/ }).getAttribute('href')).toBe('/blog/r1')
    expect(screen.getByRole('link', { name: /OpenChat/ }).getAttribute('href')).toContain('utm_medium=article')
  })

  it('shows a not-found message for a missing article and never renders a draft', async () => {
    storeState.loadArticle.mockResolvedValue(null)
    const { unmount } = show('nope')
    expect(await screen.findByText('ไม่พบบทความนี้')).toBeTruthy()
    unmount()
    storeState.loadArticle.mockResolvedValue(article({ status: 'draft' }))
    show()
    expect(await screen.findByText('ไม่พบบทความนี้')).toBeTruthy()
  })

  it('shows a retry hint when loading fails', async () => {
    storeState.loadArticle.mockRejectedValue(new Error('offline'))
    show()
    expect(await screen.findByText(/โหลดบทความไม่สำเร็จ/)).toBeTruthy()
  })
})
