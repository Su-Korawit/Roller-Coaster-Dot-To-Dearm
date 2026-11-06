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
  it('has the five apps and the seven store websites', () => {
    const ids = OS_APPS.map((a) => a.id)
    for (const id of ['goal', 'habit', 'reading', 'community', 'secretary']) expect(ids).toContain(id)
    const links = OS_APPS.filter((a) => a.url)
    expect(links).toHaveLength(7)
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
