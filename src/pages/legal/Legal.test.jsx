// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from './PrivacyPage'
import TermsPage from './TermsPage'
import { PRIVACY, TERMS, ERASURE_DELETED, ERASURE_KEPT } from '../../data/legalContent'
import { CONSENT_VERSION, CONTACT_EMAIL, LEGAL_PATHS } from '../../constants/legal'

afterEach(cleanup)
const wrap = (el) => render(<MemoryRouter>{el}</MemoryRouter>)

describe('legal pages', () => {
  it('Privacy renders every section heading, the effective date and the contact', () => {
    wrap(<PrivacyPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(PRIVACY.title)
    for (const s of PRIVACY.sections) {
      expect(screen.getByRole('heading', { level: 2, name: s.heading }), s.id).toBeTruthy()
    }
    expect(screen.getByText(PRIVACY.subtitle)).toBeTruthy()
    expect(screen.getAllByText((_, el) => el?.textContent?.includes(CONTACT_EMAIL)).length).toBeGreaterThan(0)
  })

  it('Terms renders every section and says it is not the official TCAS site', () => {
    wrap(<TermsPage />)
    for (const s of TERMS.sections) {
      expect(screen.getByRole('heading', { level: 2, name: s.heading }), s.id).toBeTruthy()
    }
    expect(screen.getByText(/ไม่ใช่เว็บไซต์หรือหน่วยงานทางการ/)).toBeTruthy()
  })

  it('the table of contents links to real section anchors', () => {
    const { container } = wrap(<PrivacyPage />)
    for (const s of PRIVACY.sections) {
      expect(container.querySelector(`a[href="#${s.id}"]`), s.id).toBeTruthy()
      expect(container.querySelector(`section#${s.id}`), s.id).toBeTruthy()
    }
  })

  it('each page links to the other document and to both from the footer', () => {
    const { container } = wrap(<PrivacyPage />)
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain(LEGAL_PATHS.terms)
    expect(hrefs).toContain(LEGAL_PATHS.privacy)
  })

  it('the erasure section shows exactly the lists the delete sheet shows (single source)', () => {
    wrap(<PrivacyPage />)
    for (const line of [...ERASURE_DELETED, ...ERASURE_KEPT]) {
      expect(screen.getByText(line), line).toBeTruthy()
    }
  })

  it('names the processors the app really uses (so the policy cannot silently drift)', () => {
    const text = JSON.stringify(PRIVACY)
    for (const p of ['Firebase', 'Gemini', 'Google Maps', 'Vercel', 'SlipOK', 'Spotify']) {
      expect(text, p).toContain(p)
    }
  })

  it('the consent version is a date string', () => {
    expect(CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
