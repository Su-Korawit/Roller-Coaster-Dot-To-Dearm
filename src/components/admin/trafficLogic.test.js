import { describe, it, expect } from 'vitest'
import { summarizeTraffic } from './trafficLogic'

describe('summarizeTraffic', () => {
  const docs = [
    { id: '2026-11-11', views: 10, visitors: 4, events: { app_goal: 3, app_habit: 1, other: 9 }, paths: { home: 6 }, devices: { mobile: 8, desktop: 2 } },
    { id: '2026-11-10', views: 5, visitors: 2, events: { app_goal: 2 }, refs: { google_com: 2 } },
  ]
  it('totals, today and ranking', () => {
    const t = summarizeTraffic(docs)
    expect(t.views).toBe(15)
    expect(t.visitors).toBe(6)
    expect(t.todayViews).toBe(10)
    expect(t.perDay[0][0]).toBe('2026-11-10')           // oldest first
    expect(t.topApps).toEqual([['goal', 5], ['habit', 1]])  // only app_* events
    expect(t.devices[0]).toEqual(['mobile', 8])
    expect(t.refs).toEqual([['google_com', 2]])
  })
  it('handles no data', () => {
    const t = summarizeTraffic([])
    expect(t.views).toBe(0)
    expect(t.todayVisitors).toBe(0)
    expect(t.topApps).toEqual([])
  })
})
