import { describe, it, expect } from 'vitest'
import { RELATED, MAX_SHORTCUTS, shortcutsFor } from './relatedApps'
import { OS_APPS } from './apps'

describe('shortcutsFor', () => {
  it('keeps order and only apps the user has', () => {
    expect(shortcutsFor('goal', (id) => id !== 'countdown')).toEqual(['checklist'])
    expect(shortcutsFor('goal', () => true)).toEqual(['countdown', 'checklist'])
  })
  it('unknown app has none', () => {
    expect(shortcutsFor('nope', () => true)).toEqual([])
  })
  it('never more than the cap and never itself', () => {
    for (const [id, list] of Object.entries(RELATED)) {
      expect(list).not.toContain(id)
      expect(shortcutsFor(id, () => true).length).toBeLessThanOrEqual(MAX_SHORTCUTS)
    }
  })
  it('only points at real apps', () => {
    const ids = new Set(OS_APPS.map((a) => a.id))
    for (const [id, list] of Object.entries(RELATED)) {
      expect(ids.has(id)).toBe(true)
      for (const t of list) expect(ids.has(t)).toBe(true)
    }
  })
})
