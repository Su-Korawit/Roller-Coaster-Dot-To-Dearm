// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const m = vi.hoisted(() => ({ getDoc: vi.fn() }))
vi.mock('firebase/firestore', () => ({ getDoc: (...a) => m.getDoc(...a) }))
vi.mock('../../lib/db', () => ({ refs: { articleDraft: (id) => ({ path: id }) } }))

const { default: StudioPreviewPage } = await import('./StudioPreviewPage')

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/studio/preview/d1']}>
      <Routes>
        <Route path="/studio/preview/:draftId" element={<StudioPreviewPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('StudioPreviewPage', () => {
  it('renders the draft the way readers will see it, through the safe renderer', async () => {
    const body = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>' }] }],
    })
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ title: 'ตัวอย่าง', body, authorName: 'Alice' }) })
    const { container } = renderPage()
    expect(await screen.findByRole('heading', { name: 'ตัวอย่าง' })).toBeTruthy()
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>alert(1)</script>')
  })

  it('says so when the draft cannot be found', async () => {
    m.getDoc.mockResolvedValue({ exists: () => false })
    renderPage()
    expect(await screen.findByText('ไม่พบบทความนี้')).toBeTruthy()
  })
})
