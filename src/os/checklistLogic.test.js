import { describe, it, expect } from 'vitest'
import {
  CHECKLIST_INDEX, loadChecklist, itemIds, cleanChecked, toggleId, progress, groupProgress,
  indexProgress, searchLists, uniLinks, safeUrl,
} from './checklistLogic'

describe('checklist data', () => {
  it('every indexed list loads, has unique item ids and the indexed item count', async () => {
    const seen = new Set()
    for (const entry of CHECKLIST_INDEX.lists) {
      expect(seen.has(entry.id)).toBe(false)
      seen.add(entry.id)
      const doc = await loadChecklist(entry.id)
      expect(doc?.id).toBe(entry.id)
      const ids = itemIds(doc)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.length).toBe(entry.items)
      expect(CHECKLIST_INDEX.groups.some((g) => g.id === entry.group)).toBe(true)
      expect(doc.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(safeUrl(doc.source?.url)).toBeTruthy()
    }
  })
  it('only has https links', async () => {
    for (const entry of CHECKLIST_INDEX.lists) {
      const doc = await loadChecklist(entry.id)
      const urls = [doc.source?.url, ...(doc.links ?? []).map((l) => l.url), ...doc.groups.flatMap((g) => g.items.map((i) => i.href)).filter(Boolean)]
      for (const u of urls) expect(u.startsWith('https://')).toBe(true)
    }
  })
  it('returns null for unknown ids', async () => {
    expect(await loadChecklist('nope')).toBeNull()
    expect(await loadChecklist('index')).toBeNull()
  })
})

describe('progress', () => {
  const doc = { groups: [{ id: 's1', items: [{ id: 'a' }, { id: 'b' }] }, { id: 's2', items: [{ id: 'c' }] }] }
  it('counts done / total / pct', () => {
    expect(progress(doc, ['a', 'c'])).toEqual({ done: 2, total: 3, pct: 67 })
    expect(progress(doc, [])).toEqual({ done: 0, total: 3, pct: 0 })
    expect(progress({ groups: [] }, ['a'])).toEqual({ done: 0, total: 0, pct: 0 })
  })
  it('per group', () => expect(groupProgress(doc.groups[0], ['a', 'x'])).toEqual({ done: 1, total: 2 }))
  it('drops unknown and duplicate ids', () => expect(cleanChecked(['a', 'a', 'zzz'], doc)).toEqual(['a']))
  it('toggles', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleId(undefined, 'a')).toEqual(['a'])
  })
  it('index progress is clamped', () => {
    expect(indexProgress({ id: 'x', items: 4 }, { x: ['1', '2'] })).toEqual({ done: 2, total: 4, pct: 50 })
    expect(indexProgress({ id: 'x', items: 1 }, { x: ['1', '2'] }).pct).toBe(100)
    expect(indexProgress({ id: 'x', items: 3 }, {}).done).toBe(0)
  })
})

describe('search and links', () => {
  it('filters by group and text', () => {
    expect(searchLists('', undefined, 'tgat').every((l) => l.group === 'tgat')).toBe(true)
    expect(searchLists('ฟิสิกส์').map((l) => l.id)).toContain('al-phy')
    expect(searchLists('zzzz')).toEqual([])
  })
  it('resolves university links and ignores unknown ids', () => {
    const l = uniLinks(['001', '999'])
    expect(l).toHaveLength(1)
    expect(l[0].url.startsWith('https://')).toBe(true)
  })
  it('safeUrl accepts only http(s)', () => {
    expect(safeUrl('https://a.b')).toBe('https://a.b')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl(null)).toBeNull()
  })
})
