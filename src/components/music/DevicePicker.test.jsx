// @vitest-environment jsdom
// src/components/music/DevicePicker.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../hooks/useSpotifyToken', () => ({ withFreshToken: (fn) => fn('AT') }))
vi.mock('../../services/spotifyApi', () => ({
  getDevices: vi.fn(),
  transferPlayback: vi.fn().mockResolvedValue(),
}))

import DevicePicker from './DevicePicker'
import { useMusicStore } from '../../stores/useMusicStore'
import { getDevices, transferPlayback } from '../../services/spotifyApi'

const PHONE = { id: 'd1', name: 'iPhone', isActive: true }
const LAPTOP = { id: 'd2', name: 'MacBook', isActive: false }

beforeEach(() => {
  useMusicStore.getState().disconnect()
  getDevices.mockReset().mockResolvedValue([PHONE, LAPTOP])
  transferPlayback.mockClear()
})

describe('DevicePicker', () => {
  it('loads devices when expanded', async () => {
    render(<DevicePicker />)
    fireEvent.click(screen.getByRole('button', { name: /เลือกอุปกรณ์/ }))
    await screen.findByText('MacBook')
    expect(getDevices).toHaveBeenCalled()
  })

  it('transfers playback to a chosen device', async () => {
    render(<DevicePicker />)
    fireEvent.click(screen.getByRole('button', { name: /เลือกอุปกรณ์/ }))
    fireEvent.click(await screen.findByText('MacBook'))
    await waitFor(() => expect(transferPlayback).toHaveBeenCalledWith('AT', 'd2'))
  })

  it('shows a hint when no devices are available', async () => {
    getDevices.mockResolvedValue([])
    render(<DevicePicker />)
    fireEvent.click(screen.getByRole('button', { name: /เลือกอุปกรณ์/ }))
    await screen.findByText(/ไม่พบอุปกรณ์/)
  })
})
