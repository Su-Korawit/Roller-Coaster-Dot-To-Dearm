import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/geminiClient', () => ({ getModel: vi.fn(), parseJSONSafe: vi.fn() }))

import { generateStudyPlan } from './aiStudyPlan'

const input = {
  target: { university: 'จุฬา', faculty: 'วิศวะ', major: 'คอม', examDate: '2027-01-05' },
  scores: [{ id: '1', subject: 'TGAT', needed: 70, mine: 40 }, { id: '2', subject: 'A-Level คณิต', needed: 60, mine: null }],
  hoursPerDay: 2,
}

describe('generateStudyPlan', () => {
  it('adds the AI note and one tip per subject', async () => {
    const ask = vi.fn().mockResolvedValue({ summary: 'ลุยเลยน้อง', tips: [{ subject: 'TGAT', tip: 'ทำข้อสอบเก่า' }] })
    const out = await generateStudyPlan(input, { today: '2027-01-01', ask })
    expect(out.aiUsed).toBe(true)
    expect(out.summary).toBe('ลุยเลยน้อง')
    expect(out.days).toBe(5)
    expect(out.tasks.filter((t) => t.text.includes('ทำข้อสอบเก่า'))).toHaveLength(1)
    expect(out.tasks.every((t) => t.auto && t.date >= '2027-01-01')).toBe(true)
  })

  it('still returns the local plan when the AI fails', async () => {
    const ask = vi.fn().mockRejectedValue(new Error('quota'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const out = await generateStudyPlan(input, { today: '2027-01-01', ask })
    spy.mockRestore()
    expect(out.aiUsed).toBe(false)
    expect(out.tasks.length).toBeGreaterThan(0)
    expect(out.summary).toContain('เหลืออีก 4 วัน')
  })

  it('returns nothing (and does not call the AI) without a usable date or subjects', async () => {
    const ask = vi.fn()
    const out = await generateStudyPlan({ ...input, target: { ...input.target, examDate: '' } }, { today: '2027-01-01', ask })
    expect(out.tasks).toEqual([])
    expect(ask).not.toHaveBeenCalled()
  })
})
