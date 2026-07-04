import { describe, it, expect, vi } from 'vitest'

vi.mock('../firebase', () => ({ storage: {} }))
vi.mock('firebase/storage', () => ({
  ref: (_s, p) => ({ path: p }),
  getDownloadURL: vi.fn(),
  uploadBytes: vi.fn(),
  uploadBytesResumable: vi.fn(),
  deleteObject: vi.fn(),
  listAll: vi.fn(),
}))
vi.mock('./cloudAsset', () => ({ bustCache: vi.fn() }))

import { toTrashPath, fromTrashPath } from './storageOps'

describe('toTrashPath', () => {
  it('prepends trash/ prefix', () => {
    expect(toTrashPath('sprites/tilesets/Grass.png')).toBe('trash/sprites/tilesets/Grass.png')
  })
  it('works for nested paths', () => {
    expect(toTrashPath('sprites/dungeon/Rock.png')).toBe('trash/sprites/dungeon/Rock.png')
  })
})

describe('fromTrashPath', () => {
  it('strips trash/ prefix', () => {
    expect(fromTrashPath('trash/sprites/tilesets/Grass.png')).toBe('sprites/tilesets/Grass.png')
  })
  it('is the inverse of toTrashPath', () => {
    const original = 'sprites/objects/Tree.png'
    expect(fromTrashPath(toTrashPath(original))).toBe(original)
  })
})

import { listAllRecursive, listFlat, deleteFile } from './storageOps'
const { listAll, deleteObject } = await import('firebase/storage')

describe('listFlat', () => {
  it('returns { path, ref } for each item in a folder', async () => {
    listAll.mockResolvedValueOnce({
      items: [{ fullPath: 'rc/tilesets/Grass.png' }, { fullPath: 'rc/tilesets/Water.png' }],
      prefixes: [],
    })
    const result = await listFlat('rc/tilesets')
    expect(result).toEqual([
      { path: 'rc/tilesets/Grass.png', ref: { fullPath: 'rc/tilesets/Grass.png' } },
      { path: 'rc/tilesets/Water.png', ref: { fullPath: 'rc/tilesets/Water.png' } },
    ])
  })

  it('returns [] when listAll rejects', async () => {
    listAll.mockRejectedValueOnce(new Error('storage/unauthorized'))
    expect(await listFlat('missing/folder')).toEqual([])
  })
})

describe('listAllRecursive', () => {
  it('walks nested prefixes and flattens all items', async () => {
    listAll
      .mockResolvedValueOnce({
        items: [{ fullPath: 'trash/a.png' }],
        prefixes: [{ fullPath: 'trash/sub' }],
      })
      .mockResolvedValueOnce({
        items: [{ fullPath: 'trash/sub/b.png' }],
        prefixes: [],
      })
    const result = await listAllRecursive('trash')
    expect(result.map((r) => r.path)).toEqual(['trash/a.png', 'trash/sub/b.png'])
  })
})

describe('deleteFile', () => {
  it('deletes the object', async () => {
    deleteObject.mockResolvedValueOnce()
    await deleteFile('rc/tilesets/Old.png')
    expect(deleteObject).toHaveBeenCalledWith({ path: 'rc/tilesets/Old.png' })
  })

  it('swallows a not-found error', async () => {
    deleteObject.mockRejectedValueOnce(new Error('storage/object-not-found'))
    await expect(deleteFile('gone.png')).resolves.toBeUndefined()
  })
})

import { uploadWithProgress, uploadAsset } from './storageOps'
const { getDownloadURL, uploadBytes: uploadBytesFn, uploadBytesResumable } = await import('firebase/storage')
const { bustCache } = await import('./cloudAsset')

describe('uploadWithProgress', () => {
  it('reports progress, busts the cache, and resolves the download URL', async () => {
    const fakeSnapshot = { ref: { path: 'rc/tilesets/New.png' } }
    let successCb
    uploadBytesResumable.mockReturnValueOnce({
      on: (_event, progressCb, _errCb, doneCb) => {
        progressCb({ bytesTransferred: 50, totalBytes: 100 })
        successCb = doneCb
      },
      snapshot: fakeSnapshot,
    })
    getDownloadURL.mockResolvedValueOnce('https://cdn/new.png')

    const onProgress = vi.fn()
    const promise = uploadWithProgress('rc/tilesets/New.png', new Blob(), { onProgress })
    successCb()
    const url = await promise

    expect(onProgress).toHaveBeenCalledWith(50)
    expect(bustCache).toHaveBeenCalledWith('rc/tilesets/New.png')
    expect(url).toBe('https://cdn/new.png')
  })

  it('rejects when the upload errors', async () => {
    uploadBytesResumable.mockReturnValueOnce({
      on: (_event, _progressCb, errCb) => errCb(new Error('upload failed')),
    })
    await expect(uploadWithProgress('x.png', new Blob())).rejects.toThrow('upload failed')
  })
})

describe('uploadAsset', () => {
  it('uploads then resolves the download URL, busting the cache', async () => {
    uploadBytesFn.mockResolvedValueOnce()
    getDownloadURL.mockResolvedValueOnce('https://cdn/x.png')
    const url = await uploadAsset('welcome/hero/1-x.png', new Blob(), { contentType: 'image/png' })
    expect(uploadBytesFn).toHaveBeenCalled()
    expect(bustCache).toHaveBeenCalledWith('welcome/hero/1-x.png')
    expect(url).toBe('https://cdn/x.png')
  })
})
