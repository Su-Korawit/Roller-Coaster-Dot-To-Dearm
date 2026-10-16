// Shared helpers for hub page tests: a fake articles store and router wrapper.
import { vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

export const storeState = {
  summaries: [],
  config: null,
  loading: false,
  error: null,
  loadHome: vi.fn(),
  loadArticle: vi.fn(),
}

export const resetStore = (patch = {}) => {
  Object.assign(storeState, { summaries: [], config: null, loading: false, error: null }, patch)
  storeState.loadHome = vi.fn()
  storeState.loadArticle = vi.fn()
}

// Mimics zustand's hook: the store is called with a selector.
export const fakeStoreHook = (selector) => selector(storeState)

export const summary = (slug, over = {}) => ({
  slug,
  title: `บทความ ${slug}`,
  excerpt: `สรุป ${slug}`,
  category: 'news',
  tags: [],
  coverUrl: 'https://x.org/c.png',
  coverAlt: 'ปก',
  authorName: 'มายด์',
  publishedAt: '2026-10-01T00:00:00.000Z',
  readingMinutes: 2,
  ...over,
})

export function renderAt(path, routes, render) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {routes.map(([p, el]) => (
          <Route key={p} path={p} element={el} />
        ))}
      </Routes>
    </MemoryRouter>,
  )
}
