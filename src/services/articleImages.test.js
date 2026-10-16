import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  refPaths: [],
}))

vi.mock('firebase/storage', () => ({
  ref: (_storage, path) => {
    m.refPaths.push(path)
    return { path }
  },
  uploadBytes: (...a) => m.uploadBytes(...a),
  getDownloadURL: (...a) => m.getDownloadURL(...a),
}))
vi.mock('../firebase', () => ({ storage: {} }))

const { uploadArticleImage, ImageError } = await import('./articleImages')

const file = (name, type, size) => ({ name, type, size })

beforeEach(() => {
  vi.clearAllMocks()
  m.refPaths.length = 0
  m.uploadBytes.mockResolvedValue({})
  m.getDownloadURL.mockResolvedValue('https://cdn.example/a.png')
})

describe('uploadArticleImage', () => {
  it('rejects a non-image', async () => {
    const err = await uploadArticleImage('d1', file('a.pdf', 'application/pdf', 1000)).catch((e) => e)
    expect(err).toBeInstanceOf(ImageError)
    expect(err.code).toBe('not_image')
    expect(m.uploadBytes).not.toHaveBeenCalled()
  })

  it('rejects an image over 5 MB', async () => {
    const err = await uploadArticleImage('d1', file('big.png', 'image/png', 6 * 1024 * 1024)).catch((e) => e)
    expect(err.code).toBe('too_large')
    expect(m.uploadBytes).not.toHaveBeenCalled()
  })

  it('uploads under the draft folder with a safe name and returns the url', async () => {
    const res = await uploadArticleImage('d1', file('รูป ปก (1).gif', 'image/gif', 1000), { now: 1700000000000 })
    expect(res).toEqual({ url: 'https://cdn.example/a.png' })
    expect(m.refPaths[0]).toMatch(/^articles\/d1\/1700000000000-[A-Za-z0-9._-]+$/)
  })
})
