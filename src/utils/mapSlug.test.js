import { describe, it, expect } from 'vitest'
import { slugify, uniqueSlug } from './mapSlug'

describe('slugify', () => {
  it('lowercases and replaces spaces with underscores', () => {
    expect(slugify('Mystic Forest')).toBe('mystic_forest')
  })
  it('strips characters outside [a-z0-9_]', () => {
    expect(slugify('Cave #2!')).toBe('cave_2')
  })
  it('collapses repeated separators and trims edges', () => {
    expect(slugify('  --Hello   World--  ')).toBe('hello_world')
  })
  it('returns "map" for an all-symbol name', () => {
    expect(slugify('!!!')).toBe('map')
  })
})

describe('uniqueSlug', () => {
  it('returns the plain slug when unused', () => {
    expect(uniqueSlug('Forest', ['cave'])).toBe('forest')
  })
  it('suffixes _2 on first collision', () => {
    expect(uniqueSlug('Forest', ['forest'])).toBe('forest_2')
  })
  it('increments until free', () => {
    expect(uniqueSlug('Forest', ['forest', 'forest_2'])).toBe('forest_3')
  })
})
