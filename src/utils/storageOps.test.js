import { describe, it, expect, vi } from 'vitest'

vi.mock('../firebase', () => ({ storage: {} }))
vi.mock('firebase/storage', () => ({
  ref: (_s, p) => ({ path: p }),
  getDownloadURL: vi.fn(),
  uploadBytes: vi.fn(),
  deleteObject: vi.fn(),
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
