import { describe, it, expect, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'TIMESTAMP'),
  query: vi.fn(),
  where: vi.fn(),
}))

import { folderSlug } from './assetFolders'

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
