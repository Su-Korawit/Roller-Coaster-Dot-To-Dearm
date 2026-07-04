import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_, ...path) => ({ _col: path.join('/') })),
  doc: vi.fn((_, ...path) => ({ _path: path.join('/'), id: path.length ? path[path.length - 1] : 'auto-id-1' })),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'TIMESTAMP'),
  query: vi.fn(),
  where: vi.fn(),
}))

import {
  folderSlug,
  listAssetFolders,
  seedSystemFolders,
  createFolder,
  renameFolder,
  trashFolder,
} from './assetFolders'
const { getDocs, setDoc, updateDoc } = await import('firebase/firestore')

function fakeSnap(docs) {
  return { docs: docs.map((data, i) => ({ id: data.id ?? `id-${i}`, data: () => data })) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('folderSlug', () => {
  it('lowercases and replaces spaces with underscores', () => {
    expect(folderSlug('My Custom Pack')).toBe('my_custom_pack')
  })
  it('strips special characters', () => {
    expect(folderSlug('Special!@# Chars')).toBe('special_chars')
  })
  it('trims whitespace', () => {
    expect(folderSlug('  dungeon  ')).toBe('dungeon')
  })
  it('collapses multiple spaces', () => {
    expect(folderSlug('A  B')).toBe('a_b')
  })
})

describe('listAssetFolders', () => {
  it('excludes trashed folders and sorts by order then path', async () => {
    getDocs.mockResolvedValueOnce(fakeSnap([
      { path: 'rc/objects', order: 1 },
      { path: 'rc/zeta', order: 0 },
      { path: 'rc/alpha', order: 0 },
      { path: 'rc/gone', order: 0, trashedAt: 'TIMESTAMP' },
    ]))
    const folders = await listAssetFolders()
    expect(folders.map((f) => f.path)).toEqual(['rc/alpha', 'rc/zeta', 'rc/objects'])
  })

  it('treats a missing order as 99 for sorting', async () => {
    getDocs.mockResolvedValueOnce(fakeSnap([
      { path: 'rc/no_order' },
      { path: 'rc/first', order: 0 },
    ]))
    const folders = await listAssetFolders()
    expect(folders.map((f) => f.path)).toEqual(['rc/first', 'rc/no_order'])
  })
})

describe('seedSystemFolders', () => {
  it('creates only the system folders that do not already exist', async () => {
    getDocs.mockResolvedValueOnce(fakeSnap([{ path: 'rc/tilesets' }]))
    await seedSystemFolders('admin-1')
    expect(setDoc).toHaveBeenCalledTimes(1)
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ path: 'rc/objects', displayName: 'Objects', isSystem: true, createdBy: 'admin-1' }),
    )
  })

  it('creates nothing when both system folders already exist', async () => {
    getDocs.mockResolvedValueOnce(fakeSnap([{ path: 'rc/tilesets' }, { path: 'rc/objects' }]))
    await seedSystemFolders('admin-1')
    expect(setDoc).not.toHaveBeenCalled()
  })
})

describe('createFolder', () => {
  it('creates a folder under rc/<slug> and returns its id', async () => {
    setDoc.mockResolvedValueOnce()
    const id = await createFolder('My Pack', [], 'admin-1')
    expect(setDoc).toHaveBeenCalledWith(
      { _path: '', id: 'auto-id-1' },
      expect.objectContaining({ path: 'rc/my_pack', displayName: 'My Pack', isSystem: false, createdBy: 'admin-1' }),
    )
    expect(id).toBe('auto-id-1')
  })

  it('throws on an empty/invalid slug', async () => {
    await expect(createFolder('!!!', [], 'admin-1')).rejects.toThrow('ชื่อ folder ไม่ถูกต้อง')
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('throws when the resulting path already exists', async () => {
    await expect(createFolder('My Pack', ['rc/my_pack'], 'admin-1')).rejects.toThrow('มีอยู่แล้ว')
    expect(setDoc).not.toHaveBeenCalled()
  })
})

describe('renameFolder', () => {
  it('updates displayName and path via refs.assetFolder(id)', async () => {
    await renameFolder('folder-1', 'New Name', 'rc/new_path', 'admin-1')
    expect(updateDoc).toHaveBeenCalledWith(
      { _path: 'assetFolders/folder-1', id: 'folder-1' },
      expect.objectContaining({ displayName: 'New Name', path: 'rc/new_path', updatedBy: 'admin-1' }),
    )
  })
})

describe('trashFolder', () => {
  it('sets trashedAt/trashedBy via refs.assetFolder(id)', async () => {
    await trashFolder('folder-1', 'admin-1')
    expect(updateDoc).toHaveBeenCalledWith(
      { _path: 'assetFolders/folder-1', id: 'folder-1' },
      expect.objectContaining({ trashedAt: 'TIMESTAMP', trashedBy: 'admin-1' }),
    )
  })
})
