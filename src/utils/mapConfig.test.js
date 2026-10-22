import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pickEntryKey, DEFAULT_MAP_CONFIGS } from './mapConfig'

const setDoc = vi.fn(() => Promise.resolve())
const getDocs = vi.fn()
vi.mock('firebase/firestore', () => ({
  doc: (_db, col, key) => ({ col, key }),
  collection: (_db, col) => ({ col }),
  getDoc: vi.fn(),
  getDocs: (...args) => getDocs(...args),
  setDoc: (...args) => setDoc(...args),
  serverTimestamp: () => '__ts__',
}))
vi.mock('../firebase', () => ({ db: {} }))

import { saveMapConfig, listMapConfigs, getMapConfig, resolveEntryKey } from './mapConfig'

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

  it('omits undefined registry fields when caller does not supply them', async () => {
    await saveMapConfig('k', { tilesets: {}, collision: {}, hidden: {} }, 'u1')
    const payload = setDoc.mock.calls[0][1]
    // No key in the payload should hold undefined
    expect(Object.values(payload).every((v) => v !== undefined)).toBe(true)
    // Registry-only fields not passed by the caller must be absent entirely
    expect('displayName' in payload).toBe(false)
    expect('order' in payload).toBe(false)
  })
})

describe('listMapConfigs — registry defaults', () => {
  beforeEach(() => getDocs.mockClear())

  it('applies defaults when a Firestore doc has no registry fields', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [{ id: 'foo', data: () => ({}) }],
    })
    const maps = await listMapConfigs()
    expect(maps).toHaveLength(1)
    const [entry] = maps
    expect(entry.key).toBe('foo')
    expect(entry.displayName).toBe('foo')          // default: the key
    expect(typeof entry.order).toBe('number')       // default: 0
    expect(typeof entry.isEntry).toBe('boolean')   // default: false (not test3)
  })
})

describe('DEFAULT_MAP_CONFIGS tileset paths', () => {
  it('has no tileset value pointing at the legacy sprites/tilesets or sprites/objects prefixes', () => {
    const legacy = Object.values(DEFAULT_MAP_CONFIGS).flatMap((cfg) =>
      Object.values(cfg.tilesets).filter(
        (v) => v.startsWith('sprites/tilesets/') || v.startsWith('sprites/objects/')
      )
    )
    expect(legacy).toEqual([])
  })
})

describe('getMapConfig for the generated School Hub', () => {
  it('keeps the redrawn tileset even when a stored config still lists the old Sprout tilesets', async () => {
    const { getDoc } = await import('firebase/firestore')
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ tilesets: { Grass: 'rc/tilesets/Grass.png', 'Wooden House': 'rc/tilesets/Wooden_House.png' } }),
    })
    const cfg = await getMapConfig('school_hub')
    expect(cfg.tilesets['School Hub Tiles']).toBe('rc/tilesets/school_hub_tiles.png')
  })
})

describe('entry map', () => {
  it('counts the built-in room as the entry even before an admin saved a document for it', () => {
    expect(resolveEntryKey([{ key: 'school_hub', isEntry: false, order: 0 }])).toBe('room')
    expect(resolveEntryKey([{ key: 'custom', isEntry: false, order: 5 }])).toBe('room')
  })

  it('boots into the room when the only flagged entry is a retired map', () => {
    expect(resolveEntryKey([{ key: 'test3', isEntry: true, order: 0 }, { key: 'room', isEntry: true, order: 1 }])).toBe('room')
    expect(resolveEntryKey([{ key: 'test2', isEntry: true, order: 0 }])).toBe('room')
  })

  it('honours a flagged entry that is not retired, and falls back to the room when there is none', () => {
    expect(resolveEntryKey([{ key: 'room', isEntry: true }, { key: 'school_hub' }])).toBe('room')
    expect(resolveEntryKey([])).toBe('room')
    expect(resolveEntryKey(null)).toBe('room')
  })
})
