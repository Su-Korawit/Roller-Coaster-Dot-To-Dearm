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
