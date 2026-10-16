import { describe, it, expect } from 'vitest'
import {
  CATEGORIES,
  CATEGORY_IDS,
  categoryLabel,
  LIMITS,
  isValidSlug,
  slugify,
  suggestSlug,
} from './schema'

describe('categories', () => {
  it('lists the five categories in order', () => {
    expect(CATEGORY_IDS).toEqual(['news', 'camps', 'guide', 'compare', 'motivation'])
    expect(CATEGORIES.map((c) => c.id)).toEqual(CATEGORY_IDS)
  })

  it('labels each category in Thai', () => {
    expect(categoryLabel('news')).toBe('ข่าว TCAS')
    expect(categoryLabel('camps')).toBe('ค่ายและกิจกรรม')
    expect(categoryLabel('guide')).toBe('แนะแนวเลือกคณะ')
    expect(categoryLabel('compare')).toBe('เทียบโครงการ')
    expect(categoryLabel('motivation')).toBe('ให้กำลังใจ')
  })

  it('returns an empty label for unknown categories', () => {
    expect(categoryLabel('nope')).toBe('')
  })
})

describe('LIMITS', () => {
  it('matches the spec values', () => {
    expect(LIMITS).toEqual({
      titleMax: 120,
      excerptMax: 160,
      tagsMax: 8,
      imageMaxBytes: 5 * 1024 * 1024,
      imageMaxWidth: 1600,
      bodyMaxBytes: 716800,
    })
  })
})

describe('slugify', () => {
  it('lower-cases and hyphenates Latin titles', () => {
    expect(slugify('Medicine KU 2570!')).toBe('medicine-ku-2570')
  })

  it('returns an empty string for Thai-only titles', () => {
    expect(slugify('คณะแพทย์')).toBe('')
  })

  it('keeps the Latin part of a mixed title', () => {
    expect(slugify('TCAS70 รอบ 3 Admission')).toBe('tcas70-3-admission')
  })

  it('trims hyphens and caps the length at 80', () => {
    expect(slugify('---a---')).toBe('a')
    expect(slugify('a'.repeat(200))).toHaveLength(80)
  })
})

describe('suggestSlug', () => {
  it('uses the title slug when it is long enough', () => {
    expect(suggestSlug('Engineering Guide', 'xyz')).toBe('engineering-guide')
  })

  it('falls back to the draft id for Thai-only or tiny titles', () => {
    expect(suggestSlug('คณะแพทย์', 'AbCdEfGh123')).toBe('a-abcdefgh')
    expect(suggestSlug('ab', 'AbCdEfGh123')).toBe('a-abcdefgh')
  })
})

describe('isValidSlug', () => {
  it.each([
    ['ab', false],
    ['abc', true],
    ['a-b_c', true],
    ['-ab', false],
    ['AbC123', true],
    ['a'.repeat(80), true],
    ['a'.repeat(81), false],
    ['has space', false],
    ['คณะ', false],
  ])('%s → %s', (slug, expected) => {
    expect(isValidSlug(slug)).toBe(expected)
  })
})
