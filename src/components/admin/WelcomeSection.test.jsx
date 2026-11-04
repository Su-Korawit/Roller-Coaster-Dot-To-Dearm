// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn((c) => c),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(),
}))
vi.mock('../../lib/db', () => ({
  refs: { welcomeGamePreview: () => 'gp', welcomeStats: () => 'st' },
  cols: { welcomeNews: 'news', welcomeFaq: 'faq', welcomeTestimonials: 'tst' },
}))
vi.mock('../../utils/storageOps', () => ({ uploadAsset: vi.fn() }))
vi.mock('./Toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

const { default: WelcomeSection } = await import('./WelcomeSection')
const { getDocs } = await import('firebase/firestore')

describe('WelcomeSection', () => {
  it('no longer edits news here: it points to the Studio instead', async () => {
    render(<WelcomeSection />)
    expect(await screen.findByText('FAQ')).toBeTruthy()
    expect(screen.queryByText('News / Blog')).toBeNull()
    expect(screen.getByRole('link', { name: /สตูดิโอ/ }).getAttribute('href')).toBe('/studio')
  })

  it('does not read the legacy news collection any more', async () => {
    getDocs.mockClear()
    render(<WelcomeSection />)
    await screen.findByText('FAQ')
    expect(getDocs.mock.calls.map(([c]) => c)).not.toContain('news')
  })
})
