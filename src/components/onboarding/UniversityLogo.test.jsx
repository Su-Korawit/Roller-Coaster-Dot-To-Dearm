// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../utils/cloudAsset', () => ({
  cloudAsset: vi.fn(() => Promise.resolve('https://storage/x.png')),
}))
import { cloudAsset } from '../../utils/cloudAsset'
import { UniversityLogo } from './UniversityStep'

const uni = {
  university_name_th: 'จุฬาลงกรณ์มหาวิทยาลัย',
  university_name_en: 'Chula',
  logo_url: 'https://cdn/bad.png',
}

describe('UniversityLogo fallback chain', () => {
  beforeEach(() => cloudAsset.mockClear())

  it('falls from a failed CDN to the resolved cloud url (no race skip)', async () => {
    render(<UniversityLogo uni={uni} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toBe('https://cdn/bad.png')
    fireEvent.error(img)
    await waitFor(() =>
      expect(screen.getByRole('img').getAttribute('src')).toBe('https://storage/x.png'),
    )
  })

  it('shows the text badge when every image source fails/absent', async () => {
    cloudAsset.mockResolvedValueOnce(null)
    render(<UniversityLogo uni={uni} />)
    fireEvent.error(screen.getByRole('img'))
    await waitFor(() => expect(screen.queryByRole('img')).toBeNull())
    expect(screen.getByText(/CU|Chula|จุฬา/i)).toBeTruthy()
  })

  it('uses bundled local image when Thai name is a prefix of the legacy key', async () => {
    cloudAsset.mockResolvedValueOnce(null)
    const shortName = {
      university_name_th: 'จุฬาลงกรณ์',
      university_name_en: 'Chulalongkorn',
      logo_url: 'https://cdn/bad.png',
    }
    render(<UniversityLogo uni={shortName} />)
    fireEvent.error(screen.getByRole('img'))
    await waitFor(() => {
      const img = screen.getByRole('img')
      expect(img.getAttribute('src')).toContain('page4/University/')
      expect(img.getAttribute('src')).not.toBe('https://cdn/bad.png')
    })
  })
})
