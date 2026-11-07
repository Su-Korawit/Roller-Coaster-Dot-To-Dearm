import { describe, it, expect } from 'vitest'
import { GUIDE_STEPS, APP_HELP } from './guideContent'
import { OS_APPS } from './apps'

describe('guide content', () => {
  const ids = new Set(OS_APPS.map((a) => a.id))
  it('every step that opens an app points at a real app', () => {
    for (const s of GUIDE_STEPS) if (s.open) expect(ids.has(s.open), s.id).toBe(true)
    expect(new Set(GUIDE_STEPS.map((s) => s.id)).size).toBe(GUIDE_STEPS.length)
  })
  it('every tip belongs to a real app and every core app has one', () => {
    for (const id of Object.keys(APP_HELP)) expect(ids.has(id), id).toBe(true)
    for (const id of ['block', 'goal', 'habit', 'calendar', 'secretary', 'mood', 'reading', 'openhouse', 'community', 'chat', 'store', 'settings']) {
      expect(APP_HELP[id]?.length, id).toBeGreaterThan(0)
    }
  })
})
