import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fetchTcas } = await import('./useMytcasFetch')

describe('fetchTcas caching', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('caches by url so repeated calls hit the network only once', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ universities: [] }) })
    vi.stubGlobal('fetch', fetchSpy)

    await fetchTcas({ university_id: 'cache-a' })
    await fetchTcas({ university_id: 'cache-a' })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('bypasses the cache when force is set', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ universities: [] }) })
    vi.stubGlobal('fetch', fetchSpy)

    await fetchTcas({ university_id: 'force-b' })
    await fetchTcas({ university_id: 'force-b' }, { force: true })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('throws on a non-ok response', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchSpy)

    await expect(fetchTcas({ university_id: 'err-c' })).rejects.toThrow('TCAS API error: 500')
  })
})
