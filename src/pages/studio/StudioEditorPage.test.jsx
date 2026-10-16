// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const m = vi.hoisted(() => ({
  getDoc: vi.fn(),
  saveDraft: vi.fn(),
  publishArticle: vi.fn(),
  unpublishArticle: vi.fn(),
  PublishError: null,
}))

vi.mock('firebase/firestore', () => ({ getDoc: (...a) => m.getDoc(...a) }))
vi.mock('../../lib/db', () => ({ refs: { articleDraft: (id) => ({ path: `articleDrafts/${id}` }) } }))
vi.mock('../../services/articles', () => {
  class PublishError extends Error {
    constructor(message, errors) {
      super(message)
      this.errors = errors
    }
  }
  m.PublishError = PublishError
  return {
    PublishError,
    saveDraft: (...a) => m.saveDraft(...a),
    publishArticle: (...a) => m.publishArticle(...a),
    unpublishArticle: (...a) => m.unpublishArticle(...a),
  }
})
vi.mock('../../services/articleImages', () => ({ uploadArticleImage: vi.fn(), ImageError: class extends Error {} }))
// The rich editor has its own tests; here it is a plain textarea that reports its value.
vi.mock('../../components/studio/ArticleEditor', () => ({
  default: ({ initialBody, onChange }) => (
    <textarea aria-label="เนื้อหา" defaultValue={initialBody} onChange={(e) => onChange(e.target.value)} />
  ),
}))

const { default: StudioEditorPage } = await import('./StudioEditorPage')

const body = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'เนื้อหา' }] }] })
const full = (over = {}) => ({
  authorUid: 'alice',
  authorName: 'Alice',
  title: 'ทุกโครงการแพทย์',
  slug: 'medicine-all',
  category: 'compare',
  excerpt: 'สรุป',
  coverUrl: 'https://x.org/c.png',
  coverAlt: 'ปก',
  tags: [],
  body,
  ...over,
})
const loaded = (data) => ({ exists: () => true, id: 'd1', data: () => data })

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/studio/d1']}>
      <Routes>
        <Route path="/studio/:draftId" element={<StudioEditorPage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })
  m.saveDraft.mockResolvedValue(undefined)
})
afterEach(() => vi.useRealTimers())

describe('StudioEditorPage', () => {
  it('does not save anything before the draft has loaded', async () => {
    m.getDoc.mockReturnValue(new Promise(() => {}))
    renderPage()
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(m.saveDraft).not.toHaveBeenCalled()
  })

  it('shows the loaded draft', async () => {
    m.getDoc.mockResolvedValue(loaded(full()))
    renderPage()
    expect((await screen.findByLabelText('ชื่อบทความ')).value).toBe('ทุกโครงการแพทย์')
  })

  it('says so when the draft does not exist', async () => {
    m.getDoc.mockResolvedValue({ exists: () => false })
    renderPage()
    expect(await screen.findByText('ไม่พบบทความนี้')).toBeTruthy()
  })

  it('autosaves edits once after the typing pause', async () => {
    m.getDoc.mockResolvedValue(loaded(full()))
    renderPage()
    fireEvent.change(await screen.findByLabelText('คำโปรย'), { target: { value: 'สรุปใหม่' } })
    fireEvent.change(screen.getByLabelText('คำโปรย'), { target: { value: 'สรุปใหม่มาก' } })
    expect(m.saveDraft).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(2100))
    expect(m.saveDraft).toHaveBeenCalledTimes(1)
    expect(m.saveDraft).toHaveBeenCalledWith('d1', { excerpt: 'สรุปใหม่มาก' })
  })

  it('shows a retry banner when saving fails', async () => {
    m.getDoc.mockResolvedValue(loaded(full()))
    m.saveDraft.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()
    fireEvent.change(await screen.findByLabelText('ชื่อบทความ'), { target: { value: 'ใหม่' } })
    await act(() => vi.advanceTimersByTimeAsync(2100))
    expect(await screen.findByText('บันทึกไม่สำเร็จ ลองใหม่')).toBeTruthy()
  })

  it('suggests a slug from the title until the article has been published', async () => {
    m.getDoc.mockResolvedValue(loaded(full({ title: '', slug: '' })))
    renderPage()
    fireEvent.change(await screen.findByLabelText('ชื่อบทความ'), { target: { value: 'Medicine All Projects' } })
    expect(screen.getByLabelText('ลิงก์บทความ').value).toBe('medicine-all-projects')
  })

  it('locks the slug once the article has been published', async () => {
    m.getDoc.mockResolvedValue(loaded(full({ publishedSlug: 'medicine-all', isLive: true })))
    renderPage()
    expect((await screen.findByLabelText('ลิงก์บทความ')).disabled).toBe(true)
  })

  it('lists problems and does not call the server when the excerpt is missing', async () => {
    m.getDoc.mockResolvedValue(loaded(full({ excerpt: '' })))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'เผยแพร่' }))
    expect(await screen.findByText('ใส่คำโปรยก่อนเผยแพร่')).toBeTruthy()
    expect(m.publishArticle).not.toHaveBeenCalled()
  })

  it('saves pending edits, then publishes a valid draft', async () => {
    m.getDoc.mockResolvedValue(loaded(full()))
    m.publishArticle.mockResolvedValue({ ok: true, slug: 'medicine-all' })
    renderPage()
    fireEvent.change(await screen.findByLabelText('ชื่อบทความ'), { target: { value: 'ชื่อที่แก้ล่าสุด' } })
    fireEvent.click(screen.getByRole('button', { name: 'เผยแพร่' }))
    await waitFor(() => expect(m.publishArticle).toHaveBeenCalledWith('d1'))
    expect(m.saveDraft).toHaveBeenCalledWith('d1', { title: 'ชื่อที่แก้ล่าสุด' })
    expect(m.saveDraft.mock.invocationCallOrder[0]).toBeLessThan(m.publishArticle.mock.invocationCallOrder[0])
    expect(await screen.findByText('เผยแพร่แล้ว')).toBeTruthy()
  })

  it('does not publish when the pending save failed', async () => {
    m.getDoc.mockResolvedValue(loaded(full()))
    m.saveDraft.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()
    fireEvent.change(await screen.findByLabelText('ชื่อบทความ'), { target: { value: 'ใหม่' } })
    fireEvent.click(screen.getByRole('button', { name: 'เผยแพร่' }))
    expect(await screen.findByText('บันทึกไม่สำเร็จ ลองใหม่')).toBeTruthy()
    expect(m.publishArticle).not.toHaveBeenCalled()
  })

  it('shows the server validation errors when publish is refused', async () => {
    m.getDoc.mockResolvedValue(loaded(full()))
    m.publishArticle.mockRejectedValue(new m.PublishError('bad', [{ field: 'coverUrl', code: 'required' }]))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'เผยแพร่' }))
    expect(await screen.findByText('เพิ่มรูปปกก่อนเผยแพร่')).toBeTruthy()
  })

  it('tells the creator when the slug is already taken', async () => {
    m.getDoc.mockResolvedValue(loaded(full()))
    m.publishArticle.mockRejectedValue(Object.assign(new Error('taken'), { code: 'functions/already-exists' }))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'เผยแพร่' }))
    expect(await screen.findByText('ลิงก์นี้มีบทความอื่นใช้แล้ว ลองเปลี่ยนลิงก์บทความ')).toBeTruthy()
  })

  it('unpublishes after a confirmation', async () => {
    m.getDoc.mockResolvedValue(loaded(full({ publishedSlug: 'medicine-all', isLive: true })))
    m.unpublishArticle.mockResolvedValue({ ok: true })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'ถอนบทความ' }))
    await waitFor(() => expect(m.unpublishArticle).toHaveBeenCalledWith('medicine-all'))
    expect(confirm).toHaveBeenCalled()
  })

  it('keeps the article live when the confirmation is declined', async () => {
    m.getDoc.mockResolvedValue(loaded(full({ publishedSlug: 'medicine-all', isLive: true })))
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'ถอนบทความ' }))
    expect(m.unpublishArticle).not.toHaveBeenCalled()
  })

  it('links to the preview of the saved draft', async () => {
    m.getDoc.mockResolvedValue(loaded(full()))
    renderPage()
    const link = await screen.findByRole('link', { name: 'ดูตัวอย่าง' })
    expect(link.getAttribute('href')).toBe('/studio/preview/d1')
  })
})
