// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('../lib/db', () => ({
  refs: { welcomeGamePreview: () => 'gp' },
}))
vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(),
}))

const { getDoc } = await import('firebase/firestore')
const { useGamePreviewMedia } = await import('./useGamePreviewMedia')

const snapDoc = (data) => ({ exists: () => data != null, data: () => data })

describe('useGamePreviewMedia', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads mediaUrl and mediaType from welcomeGamePreview', async () => {
    getDoc.mockResolvedValueOnce(snapDoc({ mediaUrl: 'https://x/clip.mp4', mediaType: 'video' }))

    const { result } = renderHook(() => useGamePreviewMedia())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current).toEqual({
      mediaUrl: 'https://x/clip.mp4',
      mediaType: 'video',
      loading: false,
    })
  })

  it('resolves empty when doc is missing', async () => {
    getDoc.mockResolvedValueOnce(snapDoc(null))

    const { result } = renderHook(() => useGamePreviewMedia())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current).toEqual({
      mediaUrl: null,
      mediaType: null,
      loading: false,
    })
  })

  it('degrades to empty defaults on read error', async () => {
    getDoc.mockRejectedValueOnce(new Error('offline'))

    const { result } = renderHook(() => useGamePreviewMedia())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current).toEqual({
      mediaUrl: null,
      mediaType: null,
      loading: false,
    })
  })
})
