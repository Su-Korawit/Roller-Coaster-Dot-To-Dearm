import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  IR_SHEET_ID,
  IDEA_STATUSES,
  isIdeaStatus,
  defaultIdeaRootData,
  defaultReportData,
} from './irBoard'

describe('irBoard constants', () => {
  it('locks the fixed sheet id contract', () => {
    expect(IR_SHEET_ID).toBe('admin-idea-board')
  })

  it('lists statuses in lifecycle order', () => {
    expect(IDEA_STATUSES).toEqual(['idea', 'planned', 'in-progress', 'done'])
  })

  it('validates statuses', () => {
    expect(isIdeaStatus('planned')).toBe(true)
    expect(isIdeaStatus('nope')).toBe(false)
  })

  it('defaults an Idea Root to status idea', () => {
    expect(defaultIdeaRootData()).toEqual({ title: '', status: 'idea' })
  })

  it('builds report data with an ISO timestamp', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-12T05:00:00.000Z'))
    expect(defaultReportData('shipped')).toEqual({
      summary: 'shipped',
      timestamp: '2026-07-12T05:00:00.000Z',
    })
    vi.useRealTimers()
  })
})
