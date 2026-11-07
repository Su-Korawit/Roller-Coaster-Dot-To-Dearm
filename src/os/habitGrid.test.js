import { describe, it, expect } from 'vitest'
import { gridWeeks, dayLevel, tasksByDay, weekIndexOf } from './habitGrid'

describe('gridWeeks', () => {
  it('starts on a Sunday 4 weeks before this week and covers today', () => {
    // 2026-11-07 is a Saturday → this week starts Sun 2026-11-01 → grid starts 2026-10-04
    const w = gridWeeks('2026-11-07')
    expect(w[0][0]).toBe('2026-10-04')
    expect(w.every((col) => col.length === 7)).toBe(true)
    expect(weekIndexOf(w, '2026-11-07')).toBe(4)
  })
  it('reaches a far exam day but never more than 40 weeks', () => {
    const w = gridWeeks('2026-11-07', '2027-03-15')
    expect(w.flat()).toContain('2027-03-15')
    expect(gridWeeks('2026-11-07', '2030-01-01')).toHaveLength(40)
  })
})

describe('dayLevel', () => {
  it('maps task completion to 0..4', () => {
    expect(dayLevel([])).toBe(0)
    expect(dayLevel([{ done: false }])).toBe(1)
    expect(dayLevel([{ done: true }, { done: false }, { done: false }])).toBe(2)
    expect(dayLevel([{ done: true }, { done: true }, { done: false }])).toBe(3)
    expect(dayLevel([{ done: true }, { done: true }])).toBe(4)
  })
})

describe('tasksByDay', () => {
  it('groups by date', () => {
    expect(Object.keys(tasksByDay([{ date: 'a' }, { date: 'b' }, { date: 'a' }]))).toEqual(['a', 'b'])
  })
})
