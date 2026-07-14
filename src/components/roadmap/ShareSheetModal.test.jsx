// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({ getDoc: vi.fn(), setSheetPublic: vi.fn() }))

vi.mock('firebase/firestore', () => ({ getDoc: (...a) => m.getDoc(...a) }))
vi.mock('../../lib/db', () => ({ refs: { roadmapSheet: (id) => ({ _path: `roadmapSheets/${id}` }) } }))
vi.mock('../../stores/useSocialStore', () => ({
  useSocialStore: (sel) => sel({ following: [], followers: [], requestUsers: {}, hydrateRequestUsers: () => {} }),
}))
vi.mock('../../services/roadmapSheets', () => ({
  shareSheet: vi.fn(),
  setSheetPublic: (...a) => m.setSheetPublic(...a),
  buildPublicShareUrl: (shareId) => `https://roadmap.ilovetcas.com/view/${shareId}`,
}))

const { default: ShareSheetModal } = await import('./ShareSheetModal')

describe('ShareSheetModal — public link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ public: false, shareId: null }) })
  })

  it('shows the toggle off and no link input when the sheet is not public', async () => {
    render(<ShareSheetModal sheetId="sheet-1" onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Toggle public link').textContent).toBe('Off'))
    expect(screen.queryByLabelText('Public share link')).toBeNull()
  })

  it('shows the copy-link input once already public', async () => {
    m.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ public: true, shareId: 'share-abc' }) })
    render(<ShareSheetModal sheetId="sheet-1" onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByLabelText('Public share link').value).toBe('https://roadmap.ilovetcas.com/view/share-abc'),
    )
  })

  it('toggling on calls setSheetPublic and reveals the link once it resolves', async () => {
    m.setSheetPublic.mockResolvedValue('new-share-id')
    render(<ShareSheetModal sheetId="sheet-1" onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Toggle public link')).toBeTruthy())
    fireEvent.click(screen.getByLabelText('Toggle public link'))
    await waitFor(() => expect(m.setSheetPublic).toHaveBeenCalledWith('sheet-1', true))
    await waitFor(() =>
      expect(screen.getByLabelText('Public share link').value).toBe('https://roadmap.ilovetcas.com/view/new-share-id'),
    )
  })
})
