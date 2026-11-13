import { describe, it, expect } from 'vitest'
import { cleanWidgetIds, toggleWidgetId, visibleWidgets, todayProgress, MAX_WIDGETS, WIDGET_DEFS } from './widgetsLogic'
import { OS_APPS } from './apps'

describe('cleanWidgetIds', () => {
  it('drops unknown and duplicate ids and caps the list', () => {
    expect(cleanWidgetIds(['habit', 'nope', 'habit', 'reading'])).toEqual(['habit', 'reading'])
    expect(cleanWidgetIds('x')).toEqual([])
    expect(cleanWidgetIds(WIDGET_DEFS.map((d) => d.id).concat('countdown')).length).toBeLessThanOrEqual(MAX_WIDGETS)
  })
})

describe('toggleWidgetId', () => {
  it('adds then removes', () => {
    const a = toggleWidgetId([], 'habit')
    expect(a).toEqual(['habit'])
    expect(toggleWidgetId(a, 'habit')).toEqual([])
  })
  it('ignores unknown ids and respects the cap', () => {
    expect(toggleWidgetId(['habit'], 'zzz')).toEqual(['habit'])
    const defs = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, appId: id }))
    const full = ['a', 'b', 'c', 'd']
    expect(toggleWidgetId(full, 'e', defs)).toEqual(full)
  })
})

describe('visibleWidgets', () => {
  it('hides widgets whose app is not available', () => {
    const got = visibleWidgets(['countdown', 'habit'], (id) => id === 'habit')
    expect(got.map((d) => d.id)).toEqual(['habit'])
  })
  it('every widget points at a real app', () => {
    const ids = new Set(OS_APPS.map((a) => a.id))
    for (const d of WIDGET_DEFS) expect(ids.has(d.appId)).toBe(true)
  })
})

describe('todayProgress', () => {
  it('counts only today', () => {
    const tasks = [{ date: 'd', done: true }, { date: 'd', done: false }, { date: 'x', done: true }]
    expect(todayProgress(tasks, 'd')).toEqual({ done: 1, total: 2, percent: 50 })
    expect(todayProgress([], 'd')).toEqual({ done: 0, total: 0, percent: 0 })
  })
})
