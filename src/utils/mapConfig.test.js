import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pickEntryKey } from './mapConfig'

const setDoc = vi.fn(() => Promise.resolve())
vi.mock('firebase/firestore', () => ({
  doc: (_db, col, key) => ({ col, key }),
  getDoc: vi.fn(),
  setDoc: (...args) => setDoc(...args),
  serverTimestamp: () => '__ts__',
}))
vi.mock('../firebase', () => ({ db: {} }))

import { saveMapConfig } from './mapConfig'

describe('pickEntryKey', () => {
  it('returns the map flagged isEntry', () => {
    expect(pickEntryKey([
      { key: 'a', order: 1, isEntry: false },
      { key: 'b', order: 2, isEntry: true },
    ])).toBe('b')
  })
  it('falls back to lowest order when none flagged', () => {
    expect(pickEntryKey([
      { key: 'a', order: 5 },
      { key: 'b', order: 2 },
    ])).toBe('b')
  })
  it('returns null for an empty registry', () => {
    expect(pickEntryKey([])).toBeNull()
  })
})

const cfg = { tilesets: {}, collision: {}, hidden: {} }

describe('saveMapConfig (L-1 regression guard)', () => {
  beforeEach(() => setDoc.mockClear())

  it('warns and stores updatedBy=null when no uid is passed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await saveMapConfig('test3', cfg)
    expect(warn).toHaveBeenCalled()
    expect(setDoc.mock.calls[0][1].updatedBy).toBe(null)
    warn.mockRestore()
  })

  it('stores the uid and does not warn when provided', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await saveMapConfig('test3', cfg, 'admin123')
    expect(warn).not.toHaveBeenCalled()
    expect(setDoc.mock.calls[0][1].updatedBy).toBe('admin123')
    warn.mockRestore()
  })
})
