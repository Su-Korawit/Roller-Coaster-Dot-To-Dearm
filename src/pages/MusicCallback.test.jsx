// @vitest-environment jsdom
// src/pages/MusicCallback.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const navigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => navigate }))
vi.mock('../services/spotifyConnect', () => ({ completeConnect: vi.fn() }))

import MusicCallback from './MusicCallback'
import { completeConnect } from '../services/spotifyConnect'

beforeEach(() => { navigate.mockReset(); completeConnect.mockReset() })

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/music/callback" element={<MusicCallback />} /></Routes>
    </MemoryRouter>,
  )
}

describe('MusicCallback', () => {
  it('completes connect then redirects home', async () => {
    completeConnect.mockResolvedValue()
    renderAt('/music/callback?code=C&state=S')
    await waitFor(() => expect(completeConnect).toHaveBeenCalledWith({ code: 'C', state: 'S' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/home', { replace: true }))
  })

  it('shows an error message when Spotify denies', async () => {
    renderAt('/music/callback?error=access_denied')
    expect(await screen.findByText(/เชื่อม Spotify ไม่สำเร็จ/)).toBeTruthy()
    expect(completeConnect).not.toHaveBeenCalled()
  })
})
