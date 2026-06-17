// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const { useMytcasFetch } = await import('./useMytcasFetch')

describe('useMytcasFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and exposes data when enabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ universities: [1] }) }),
    )

    const { result } = renderHook(() => useMytcasFetch({ university_id: 'hook-a' }, ['hook-a']))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ universities: [1] })
    expect(result.current.error).toBeNull()
  })

  it('does not fetch while disabled', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() =>
      useMytcasFetch({ university_id: 'x' }, ['x'], { enabled: false }),
    )

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refetch re-runs the request, bypassing the cache', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ universities: [] }) })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() =>
      useMytcasFetch({ university_id: 'hook-refetch' }, ['hook-refetch']),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      result.current.refetch()
    })

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
  })
})
