import { describe, it, expect } from 'vitest'
import { SETTINGS_CATEGORIES } from './settingsCategories'

describe('SETTINGS_CATEGORIES', () => {
  it('has unique ids and a label + hint each', () => {
    const ids = SETTINGS_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(SETTINGS_CATEGORIES.every((c) => c.label && c.hint)).toBe(true)
  })
})
