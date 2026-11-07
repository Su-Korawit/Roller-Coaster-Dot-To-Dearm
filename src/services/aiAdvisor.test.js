import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/geminiClient', () => ({ getModel: vi.fn(), parseJSONSafe: vi.fn() }))

import { buildAdvisorPrompt, parseSuggestions, suggestPrograms, MAX_SUGGESTIONS } from './aiAdvisor'

describe('buildAdvisorPrompt', () => {
  it('includes interests, subjects, time left and asks for JSON only', () => {
    const p = buildAdvisorPrompt({ interests: ['ชอบวาดรูป'], subjects: ['คณิต'], note: 'อยู่ภาคเหนือ', daysLeft: 30 })
    for (const s of ['ชอบวาดรูป', 'คณิต', 'อยู่ภาคเหนือ', 'เหลือเวลาอีก 30 วัน', 'JSON']) expect(p).toContain(s)
  })
  it('copes with an empty form', () => {
    expect(buildAdvisorPrompt({})).toContain('ไม่ได้ระบุ')
  })
})

describe('parseSuggestions', () => {
  it('keeps valid rows, trims text and caps the count', () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ university: ` ม.${i} `, faculty: 'คณะ', program: 'สาขา', reason: 'ดี' }))
    const out = parseSuggestions({ suggestions: [{ university: '', faculty: 'x' }, ...rows] })
    expect(out).toHaveLength(MAX_SUGGESTIONS)
    expect(out[0].university).toBe('ม.0')
  })
  it('returns [] for garbage', () => {
    expect(parseSuggestions(null)).toEqual([])
    expect(parseSuggestions({ suggestions: 'x' })).toEqual([])
  })
})

describe('suggestPrograms', () => {
  it('goes through the injected ask', async () => {
    const ask = vi.fn(async () => ({ suggestions: [{ university: 'จุฬา', faculty: 'วิศวะ', program: 'คอม', reason: 'r' }] }))
    expect(await suggestPrograms({ interests: ['คอม'] }, { ask })).toHaveLength(1)
    expect(ask).toHaveBeenCalledOnce()
  })
})
