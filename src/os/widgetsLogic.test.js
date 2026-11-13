import { describe, it, expect } from 'vitest'
import {
  cleanWidgetIds, toggleWidgetId, visibleWidgets, todayProgress, todayTasks, weekBars, barRatios, urgencyRing, widgetSpan,
  MAX_WIDGETS, WIDGET_DEFS,
} from './widgetsLogic'
import { OS_APPS } from './apps'

describe('cleanWidgetIds', () => {
  it('drops unknown and duplicate ids and caps the list', () => {
    expect(cleanWidgetIds(['plan-today', 'nope', 'plan-today', 'reading-week'])).toEqual(['plan-today', 'reading-week'])
    expect(cleanWidgetIds('x')).toEqual([])
    expect(cleanWidgetIds(WIDGET_DEFS.map((d) => d.id)).length).toBe(MAX_WIDGETS)
  })
  it('renames the ids of the first version', () => {
    expect(cleanWidgetIds(['countdown', 'habit', 'reading'])).toEqual(['exam-next', 'plan-today', 'reading-week'])
  })
})

describe('toggleWidgetId', () => {
  it('adds then removes', () => {
    const a = toggleWidgetId([], 'plan-today')
    expect(a).toEqual(['plan-today'])
    expect(toggleWidgetId(a, 'plan-today')).toEqual([])
  })
  it('ignores unknown ids and respects the cap', () => {
    expect(toggleWidgetId(['plan-today'], 'zzz')).toEqual(['plan-today'])
    const defs = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, appId: id }))
    const full = ['a', 'b', 'c', 'd']
    expect(toggleWidgetId(full, 'e', defs)).toEqual(full)
  })
})

describe('visibleWidgets / registry', () => {
  it('hides widgets whose app is not available', () => {
    const got = visibleWidgets(['exam-next', 'plan-today'], (id) => id === 'habit')
    expect(got.map((d) => d.id)).toEqual(['plan-today'])
  })
  it('every widget points at a real app and has a size and a tone', () => {
    const ids = new Set(OS_APPS.map((a) => a.id))
    for (const d of WIDGET_DEFS) {
      expect(ids.has(d.appId)).toBe(true)
      expect(['small', 'medium']).toContain(d.size)
      expect(d.tone).toBeTruthy()
    }
    expect(new Set(WIDGET_DEFS.map((d) => d.id)).size).toBe(WIDGET_DEFS.length)
  })
})

describe('widgetSpan', () => {
  it('small is 2 columns, medium 4, never more than the grid', () => {
    expect(widgetSpan('small', 8)).toBe(2)
    expect(widgetSpan('medium', 8)).toBe(4)
    expect(widgetSpan('medium', 4)).toBe(4)
    expect(widgetSpan('medium', 3)).toBe(3)
  })
})

describe('todayProgress / todayTasks', () => {
  const tasks = [
    { id: 1, date: 'd', done: true }, { id: 2, date: 'd', done: false },
    { id: 3, date: 'x', done: true }, { id: 4, date: 'd', done: false }, { id: 5, date: 'd', done: false },
  ]
  it('counts only today', () => {
    expect(todayProgress(tasks, 'd')).toEqual({ done: 1, total: 4, percent: 25 })
    expect(todayProgress([], 'd')).toEqual({ done: 0, total: 0, percent: 0 })
  })
  it('lists unfinished first and caps', () => {
    expect(todayTasks(tasks, 'd', 3).map((t) => t.id)).toEqual([2, 4, 5])
    expect(todayTasks(tasks, 'd', 9).map((t) => t.id)).toEqual([2, 4, 5, 1])
  })
})

describe('weekBars / barRatios', () => {
  // 2026-11-11 is a Wednesday; its week runs 2026-11-09 .. 2026-11-15.
  const log = { '2026-11-09': 30, '2026-11-11': 120, '2026-11-14': 50 }
  it('has seven days Monday first, marking today and the future', () => {
    const bars = weekBars(log, '2026-11-11')
    expect(bars.map((b) => b.key)[0]).toBe('2026-11-09')
    expect(bars).toHaveLength(7)
    expect(bars[2]).toMatchObject({ minutes: 120, today: true, future: false })
    expect(bars[3].future).toBe(true)
    expect(bars[1].minutes).toBe(0)
  })
  it('scales to the longest day with a floor', () => {
    const bars = weekBars(log, '2026-11-11')
    const r = barRatios(bars)
    expect(r[2]).toBe(1)
    expect(r[0]).toBeCloseTo(0.25)
    expect(barRatios(weekBars({ '2026-11-09': 30 }, '2026-11-11'))[0]).toBeCloseTo(0.5)   // floor 60
  })
})

describe('urgencyRing', () => {
  it('fills as the day nears', () => {
    expect(urgencyRing(100)).toBe(0)
    expect(urgencyRing(50)).toBe(0.5)
    expect(urgencyRing(0)).toBe(1)
    expect(urgencyRing(-3)).toBe(1)
    expect(urgencyRing(500)).toBe(0)
    expect(urgencyRing(null)).toBe(0)
  })
})
