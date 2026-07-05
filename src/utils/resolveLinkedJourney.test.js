import { describe, it, expect } from 'vitest'
import { resolveLinkedJourney } from './resolveLinkedJourney'

const journeys = {
  mastery: [{ id: 'm1', title: 'Learn React', progress: 40 }],
  career: [{ id: 'c1', title: 'Get internship', progress: 10 }],
  university: [],
}

describe('resolveLinkedJourney', () => {
  it('returns null when journeyRef is null', () => {
    expect(resolveLinkedJourney(null, journeys)).toBeNull()
  })

  it('resolves the live item for a valid ref', () => {
    const item = resolveLinkedJourney({ category: 'mastery', id: 'm1' }, journeys)
    expect(item).toEqual({ id: 'm1', title: 'Learn React', progress: 40 })
  })

  it('returns null when the referenced item was deleted', () => {
    const item = resolveLinkedJourney({ category: 'mastery', id: 'gone' }, journeys)
    expect(item).toBeNull()
  })

  it('returns null when the referenced category is empty', () => {
    const item = resolveLinkedJourney({ category: 'university', id: 'anything' }, journeys)
    expect(item).toBeNull()
  })

  it('reflects live progress updates without needing a copy', () => {
    const updated = { ...journeys, mastery: [{ id: 'm1', title: 'Learn React', progress: 90 }] }
    const item = resolveLinkedJourney({ category: 'mastery', id: 'm1' }, updated)
    expect(item.progress).toBe(90)
  })
})
