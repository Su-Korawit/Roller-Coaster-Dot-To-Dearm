import { describe, it, expect } from 'vitest'
import { homeAppIds, paginate, searchStoreApps, OS_APPS } from './apps'

const fake = [
  { id: 'store', name: 'Store', builtIn: true, installable: false },
  { id: 'notes', name: 'Notes', tagline: 'จดโน้ต', installable: true },
  { id: 'calc', name: 'Calc', installable: true },
]

describe('homeAppIds', () => {
  it('lists built-ins first, then installed apps', () => {
    expect(homeAppIds(['calc', 'notes'], fake)).toEqual(['store', 'calc', 'notes'])
  })
  it('drops unknown, duplicate and built-in ids', () => {
    expect(homeAppIds(['nope', 'notes', 'notes', 'store'], fake)).toEqual(['store', 'notes'])
  })
  it('works with the real registry', () => {
    expect(homeAppIds([])).toContain('store')
    expect(OS_APPS.every((a) => a.id && a.name && a.Icon && a.load)).toBe(true)
  })
})

describe('registry content', () => {
  it('has the five apps and the twelve store websites', () => {
    const ids = OS_APPS.map((a) => a.id)
    for (const id of ['goal', 'habit', 'reading', 'community', 'secretary']) expect(ids).toContain(id)
    const links = OS_APPS.filter((a) => a.url && a.id.startsWith('link-'))
    expect(links).toHaveLength(12)
    expect(links.every((a) => a.url.startsWith('https://') && a.installable)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('paginate', () => {
  it('splits into pages', () => {
    expect(paginate([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
  it('always returns at least one page', () => {
    expect(paginate([], 4)).toEqual([[]])
  })
  it('guards a bad page size', () => {
    expect(paginate([1, 2], 0)).toEqual([[1], [2]])
  })
})

describe('searchStoreApps', () => {
  it('only returns installable apps', () => {
    expect(searchStoreApps('', fake).map((a) => a.id)).toEqual(['notes', 'calc'])
  })
  it('matches name or tagline, case-insensitive', () => {
    expect(searchStoreApps('NOTE', fake).map((a) => a.id)).toEqual(['notes'])
    expect(searchStoreApps('จด', fake).map((a) => a.id)).toEqual(['notes'])
  })
})

describe('store catalogue', () => {
  it('every installable app belongs to a known category and sections keep CATEGORIES order', async () => {
    const { OS_APPS, CATEGORIES, groupByCategory, searchStoreApps } = await import('./apps')
    const ids = new Set(CATEGORIES.map((c) => c.id))
    for (const a of OS_APPS.filter((x) => x.installable)) expect(ids.has(a.category)).toBe(true)
    const groups = groupByCategory(searchStoreApps(''))
    expect(groups.map((g) => g.id)).toEqual(CATEGORIES.map((c) => c.id))
    expect(groups.flatMap((g) => g.apps)).toHaveLength(OS_APPS.filter((x) => x.installable).length)
    expect(searchStoreApps('', OS_APPS, 'university').map((a) => a.id)).toContain('link-kuadmission')
  })
  it('KU Admission is in the Store and sites that forbid framing are flagged', async () => {
    const { findApp } = await import('./apps')
    expect(findApp('link-kuadmission').url).toBe('https://admission.ku.ac.th/kuadm/')
    for (const id of ['link-ku-kps', 'link-ku-src', 'link-ku-csc']) expect(findApp(id).category).toBe('university')
    expect(findApp('link-ku-src').embed).toBe(true)
    expect(findApp('link-kuadmission').embed).toBe(false)
    expect(findApp('link-tcaster').embed).toBe(true)
  })
})

describe('reorderIds (drag on Home)', () => {
  it('moves the dragged id into the target slot, both directions', async () => {
    const { reorderIds } = await import('./apps')
    expect(reorderIds(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd'])
    expect(reorderIds(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['a', 'd', 'b', 'c'])
  })
  it('ignores unknown ids and drops onto itself', async () => {
    const { reorderIds } = await import('./apps')
    const ids = ['a', 'b']
    expect(reorderIds(ids, 'a', 'a')).toBe(ids)
    expect(reorderIds(ids, 'x', 'a')).toBe(ids)
    expect(reorderIds(ids, 'a', 'x')).toBe(ids)
  })
})
