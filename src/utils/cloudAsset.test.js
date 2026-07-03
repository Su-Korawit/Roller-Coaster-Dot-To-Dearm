import { describe, it, expect, vi, beforeEach } from 'vitest'

const getDownloadURL = vi.fn()
vi.mock('../firebase', () => ({ storage: {} }))
vi.mock('firebase/storage', () => ({
  ref: (_storage, path) => ({ path }),
  getDownloadURL: (...args) => getDownloadURL(...args),
}))

import { cloudAsset, bustCache } from './cloudAsset'

describe('cloudAsset', () => {
  beforeEach(() => {
    getDownloadURL.mockReset()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.clear()
  })

  it('shares one network round-trip per path (returns the same Promise)', async () => {
    getDownloadURL.mockResolvedValue('https://cdn/x.png')
    const a = cloudAsset('p/x.png')
    const b = cloudAsset('p/x.png')
    expect(a).toBe(b)
    await expect(a).resolves.toBe('https://cdn/x.png')
    expect(getDownloadURL).toHaveBeenCalledTimes(1)
  })

  it('resolves to the fallback when the download fails', async () => {
    getDownloadURL.mockRejectedValue(new Error('500'))
    await expect(cloudAsset('p/missing.png', { fallback: '/local.png' })).resolves.toBe('/local.png')
  })

  it('bustCache forces a re-fetch on the next call (M-6 regression guard)', async () => {
    getDownloadURL.mockResolvedValue('https://cdn/y.png')
    await cloudAsset('p/y.png')
    expect(getDownloadURL).toHaveBeenCalledTimes(1)
    bustCache('p/y.png')
    await cloudAsset('p/y.png')
    expect(getDownloadURL).toHaveBeenCalledTimes(2)
  })

  it('persists a resolved URL to localStorage and reuses it after a module reset (no second getDownloadURL)', async () => {
    getDownloadURL.mockResolvedValueOnce('https://cdn/x.png')
    await cloudAsset('rc/tilesets/Grass.png')
    vi.resetModules()
    const fresh = await import('./cloudAsset.js')
    const url = await fresh.cloudAsset('rc/tilesets/Grass.png')
    expect(url).toBe('https://cdn/x.png')
    expect(getDownloadURL).toHaveBeenCalledTimes(1)
  })

  it('refetches when the persisted entry is older than the TTL', async () => {
    localStorage.setItem('rc-asset-url:p', JSON.stringify({ url: 'https://old', ts: Date.now() - 25 * 60 * 60 * 1000 }))
    getDownloadURL.mockResolvedValueOnce('https://new')
    expect(await cloudAsset('p')).toBe('https://new')
  })

  it('bustCache clears the persisted entry too', async () => {
    getDownloadURL.mockResolvedValueOnce('https://cdn/x.png')
    await cloudAsset('p')
    bustCache('p')
    expect(localStorage.getItem('rc-asset-url:p')).toBeNull()
  })

  it('does not persist fallback results', async () => {
    getDownloadURL.mockRejectedValueOnce(new Error('offline'))
    await cloudAsset('p', { fallback: '/assets/x.png' })
    expect(localStorage.getItem('rc-asset-url:p')).toBeNull()
  })
})
