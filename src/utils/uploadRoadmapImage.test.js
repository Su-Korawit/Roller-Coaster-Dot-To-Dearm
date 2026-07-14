import { describe, it, expect, vi } from 'vitest'

vi.mock('./storageOps', () => ({ uploadAsset: vi.fn().mockResolvedValue('https://x/u') }))
vi.mock('../services/fileBag', () => ({
  registerBagItem: vi.fn().mockResolvedValue('bag-id'),
}))
import { uploadAsset } from './storageOps'
import { uploadRoadmapImage } from './uploadRoadmapImage'
import { registerBagItem } from '../services/fileBag'

describe('uploadRoadmapImage', () => {
  it('uploads under users/{uid}/roadmap/{nodeId}- and returns the url', async () => {
    const file = new File(['x'], 'p.png', { type: 'image/png' })
    const url = await uploadRoadmapImage('u1', 'node-9', file)
    expect(url).toBe('https://x/u')
    const [path, passedFile, opts] = uploadAsset.mock.calls[0]
    expect(path).toMatch(/^users\/u1\/roadmap\/node-9-\d+$/)
    expect(passedFile).toBe(file)
    expect(opts).toEqual({ contentType: 'image/png' })
    expect(registerBagItem).toHaveBeenCalledWith(expect.objectContaining({
      ownerUid: 'u1',
      kind: 'image',
      source: 'roadmap-image',
    }))
  })

  it('rejects non-image files', async () => {
    const file = new File(['x'], 'p.pdf', { type: 'application/pdf' })
    await expect(uploadRoadmapImage('u1', 'n', file)).rejects.toThrow(/image/i)
  })
})
