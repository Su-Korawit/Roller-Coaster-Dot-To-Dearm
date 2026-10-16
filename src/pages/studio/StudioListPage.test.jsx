// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const m = vi.hoisted(() => ({
  auth: { user: { uid: 'alice', displayName: 'Alice' }, claims: { creator: true } },
  getDocs: vi.fn(),
  createDraft: vi.fn(),
  deleteDraft: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({ getDocs: (...a) => m.getDocs(...a) }))
vi.mock('../../lib/db', () => ({
  queries: { draftsByAuthor: (uid) => ({ q: 'mine', uid }), allDrafts: () => ({ q: 'all' }) },
}))
vi.mock('../../stores/useAuthStore', () => ({ useAuthStore: (sel) => sel(m.auth) }))
vi.mock('../../services/articles', () => ({
  createDraft: (...a) => m.createDraft(...a),
  deleteDraft: (...a) => m.deleteDraft(...a),
}))
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => m.navigate }))

const { default: StudioListPage } = await import('./StudioListPage')

const ts = (iso) => ({ toMillis: () => new Date(iso).getTime() })
const snap = (docs) => ({ docs: docs.map(({ id, ...data }) => ({ id, data: () => data })) })
const draft = (id, over = {}) => ({
  id,
  title: `ร่าง ${id}`,
  authorUid: 'alice',
  authorName: 'Alice',
  updatedAt: ts('2026-10-10T00:00:00Z'),
  ...over,
})

const renderPage = () => render(<MemoryRouter><StudioListPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  m.auth = { user: { uid: 'alice', displayName: 'Alice' }, claims: { creator: true } }
  m.createDraft.mockResolvedValue('fresh1')
})

describe('StudioListPage', () => {
  it('invites the first article when there are no drafts', async () => {
    m.getDocs.mockResolvedValue(snap([]))
    renderPage()
    expect(await screen.findByText('ยังไม่มีบทความ เริ่มเขียนบทความแรกได้เลย')).toBeTruthy()
  })

  it('lists own drafts, newest edit first, with status chips', async () => {
    m.getDocs.mockResolvedValue(
      snap([
        draft('old', { updatedAt: ts('2026-10-01T00:00:00Z') }),
        draft('live', { isLive: true, publishedSlug: 'live', publishedAt: ts('2026-10-09T00:00:00Z'), updatedAt: ts('2026-10-09T00:00:00Z') }),
        draft('dirty', { isLive: true, publishedSlug: 'dirty', publishedAt: ts('2026-10-02T00:00:00Z'), updatedAt: ts('2026-10-12T00:00:00Z') }),
      ]),
    )
    renderPage()
    await screen.findByText('ร่าง dirty')
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titles).toEqual(['ร่าง dirty', 'ร่าง live', 'ร่าง old'])
    expect(screen.getAllByText('ฉบับร่าง')).toHaveLength(1)
    expect(screen.getAllByText('เผยแพร่แล้ว')).toHaveLength(1)
    expect(screen.getAllByText('เผยแพร่แล้ว มีการแก้ไขที่ยังไม่เผยแพร่')).toHaveLength(1)
  })

  it('does not call a just-published or republished article edited', async () => {
    // Republishing keeps the first publishedAt; only liveUpdatedAt moves with updatedAt.
    m.getDocs.mockResolvedValue(
      snap([
        draft('again', {
          isLive: true,
          publishedSlug: 'again',
          publishedAt: ts('2026-10-01T00:00:00Z'),
          liveUpdatedAt: ts('2026-10-12T00:00:00Z'),
          updatedAt: ts('2026-10-12T00:00:00Z'),
        }),
      ]),
    )
    renderPage()
    await screen.findByText('ร่าง again')
    expect(screen.getByText('เผยแพร่แล้ว')).toBeTruthy()
    expect(screen.queryByText('เผยแพร่แล้ว มีการแก้ไขที่ยังไม่เผยแพร่')).toBeNull()
  })

  it('flags edits made after the last publish', async () => {
    m.getDocs.mockResolvedValue(
      snap([
        draft('edited', {
          isLive: true,
          publishedSlug: 'edited',
          publishedAt: ts('2026-10-01T00:00:00Z'),
          liveUpdatedAt: ts('2026-10-12T00:00:00Z'),
          updatedAt: ts('2026-10-13T00:00:00Z'),
        }),
      ]),
    )
    renderPage()
    expect(await screen.findByText('เผยแพร่แล้ว มีการแก้ไขที่ยังไม่เผยแพร่')).toBeTruthy()
  })

  it('shows an unpublished draft that once went live as a draft', async () => {
    m.getDocs.mockResolvedValue(snap([draft('gone', { isLive: false, publishedSlug: 'gone', publishedAt: ts('2026-10-02T00:00:00Z') })]))
    renderPage()
    await screen.findByText('ร่าง gone')
    expect(screen.getByText('ฉบับร่าง')).toBeTruthy()
  })

  it('creates a draft and opens the editor', async () => {
    m.getDocs.mockResolvedValue(snap([]))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'เขียนบทความใหม่' }))
    await waitFor(() => expect(m.navigate).toHaveBeenCalledWith('/studio/fresh1'))
    expect(m.createDraft).toHaveBeenCalledWith('alice', 'Alice')
  })

  it('lets the super-admin see every draft and filter by author', async () => {
    m.auth = { user: { uid: 'IaltEhO0mPVfK3ng8npr4CdqnEE3', displayName: 'Root' }, claims: {} }
    m.getDocs.mockResolvedValue(snap([draft('a1'), draft('b1', { authorUid: 'bob', authorName: 'Bob' })]))
    renderPage()
    await screen.findByText('ร่าง a1')
    expect(m.getDocs).toHaveBeenCalledWith({ q: 'all' })
    fireEvent.change(screen.getByLabelText('ผู้เขียน'), { target: { value: 'bob' } })
    expect(screen.queryByText('ร่าง a1')).toBeNull()
    expect(screen.getByText('ร่าง b1')).toBeTruthy()
  })

  it('asks before deleting a never-published draft', async () => {
    m.getDocs.mockResolvedValue(snap([draft('old')]))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'ลบร่าง ร่าง old' }))
    await waitFor(() => expect(m.deleteDraft).toHaveBeenCalledWith('old'))
    expect(screen.queryByText('ร่าง old')).toBeNull()
  })

  it('offers no delete for an article that was ever published', async () => {
    m.getDocs.mockResolvedValue(snap([draft('live', { isLive: true, publishedSlug: 'live', publishedAt: ts('2026-10-09T00:00:00Z') })]))
    renderPage()
    await screen.findByText('ร่าง live')
    expect(screen.queryByRole('button', { name: /ลบร่าง/ })).toBeNull()
  })

  it('shows a retry when loading fails', async () => {
    m.getDocs.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(snap([]))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'ลองใหม่' }))
    expect(await screen.findByText('ยังไม่มีบทความ เริ่มเขียนบทความแรกได้เลย')).toBeTruthy()
  })
})
