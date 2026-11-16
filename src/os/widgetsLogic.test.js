import { describe, it, expect } from 'vitest'
import {
  cleanWidgetIds, toggleWidgetId, visibleWidgets, todayProgress, todayTasks, weekBars, barRatios, urgencyRing, widgetSpan, widgetRows, weekStats, WIDGET_FAMILIES, SIZES,
  MAX_WIDGETS, WIDGET_DEFS,
} from './widgetsLogic'
import { OS_APPS } from './apps'

describe('cleanWidgetIds', () => {
  it('drops unknown and duplicate ids and caps the list', () => {
    expect(cleanWidgetIds(['plan:medium', 'nope', 'plan:medium', 'reading:large'])).toEqual(['plan:medium', 'reading:large'])
    expect(cleanWidgetIds('x')).toEqual([])
    expect(cleanWidgetIds(WIDGET_DEFS.map((d) => d.id)).length).toBe(MAX_WIDGETS)
  })
  it('rejects a size the family does not have', () => {
    expect(cleanWidgetIds(['portfolio:large', 'secretary:large'])).toEqual([])
  })
  it('renames the ids of earlier versions', () => {
    expect(cleanWidgetIds(['countdown', 'habit', 'reading'])).toEqual(['countdown:small', 'plan:medium', 'reading:medium'])
    expect(cleanWidgetIds(['exam-list', 'plan-today', 'portfolio', 'secretary'])).toEqual(['countdown:medium', 'plan:medium', 'portfolio:small', 'secretary:small'])
  })
})

describe('toggleWidgetId', () => {
  it('adds then removes', () => {
    const a = toggleWidgetId([], 'plan:medium')
    expect(a).toEqual(['plan:medium'])
    expect(toggleWidgetId(a, 'plan:medium')).toEqual([])
    expect(toggleWidgetId(a, 'plan:large')).toEqual(['plan:medium', 'plan:large'])   // another size of the same app is a second widget
  })
  it('ignores unknown ids and respects the cap', () => {
    expect(toggleWidgetId(['plan:medium'], 'zzz')).toEqual(['plan:medium'])
    const defs = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, appId: id }))
    const full = ['a', 'b', 'c', 'd', 'e', 'f']
    expect(toggleWidgetId(full, 'g', defs)).toEqual(full)
  })
})

describe('visibleWidgets / registry', () => {
  it('hides widgets whose app is not available', () => {
    const got = visibleWidgets(['countdown:small', 'plan:medium'], (id) => id === 'habit')
    expect(got.map((d) => d.id)).toEqual(['plan:medium'])
  })
  it('every widget points at a real app and has a size and a tone', () => {
    const ids = new Set(OS_APPS.map((a) => a.id))
    for (const d of WIDGET_DEFS) {
      expect(ids.has(d.appId)).toBe(true)
      expect(SIZES).toContain(d.size)
      expect(d.tone).toBeTruthy()
    }
    expect(new Set(WIDGET_DEFS.map((d) => d.id)).size).toBe(WIDGET_DEFS.length)
  })
})

describe('families', () => {
  it('each family has several sizes and every app appears once or more', () => {
    for (const f of WIDGET_FAMILIES) expect(f.sizes.length).toBeGreaterThanOrEqual(2)
    expect(WIDGET_DEFS.map((d) => d.id)).toContain('countdown:large')
  })
  it('large takes two rows', () => {
    expect(widgetRows('large')).toBe(2)
    expect(widgetRows('small')).toBe(1)
    expect(widgetSpan('large', 8)).toBe(4)
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

describe('weekStats', () => {
  it('totals, active days, average and best', () => {
    const bars = weekBars({ '2026-11-09': 30, '2026-11-11': 90 }, '2026-11-11')
    expect(weekStats(bars)).toEqual({ total: 120, activeDays: 2, avg: 60, best: 90 })
    expect(weekStats(weekBars({}, '2026-11-11'))).toEqual({ total: 0, activeDays: 0, avg: 0, best: 0 })
  })
})
