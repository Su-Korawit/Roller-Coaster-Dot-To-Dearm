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
})
