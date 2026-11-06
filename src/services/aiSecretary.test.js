import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/geminiClient', () => ({ getModel: vi.fn(), parseJSONSafe: vi.fn() }))

import { buildSecretaryContext, buildSecretaryPrompt, askSecretary } from './aiSecretary'

const life = {
  target: { university: 'จุฬา', faculty: 'วิศวะ', major: 'คอม', examDate: '2027-01-10' },
  scores: [{ subject: 'TGAT', needed: 70, mine: 40 }, { subject: 'คณิต', needed: 60, mine: null }],
  tasks: [
    { date: '2027-01-01', text: 'TGAT 60 นาที', done: false, auto: true, minutes: 60 },
    { date: '2027-01-01', text: 'คณิต 60 นาที', done: true, auto: true, minutes: 60 },
  ],
  readLog: { '2027-01-01': 45 },
}

describe('buildSecretaryContext', () => {
  const ctx = buildSecretaryContext(life, '2027-01-01')
  it('summarises goal, countdown, progress and open tasks', () => {
    expect(ctx).toContain('วิศวะ')
    expect(ctx).toContain('เหลือ 9 วัน')
    expect(ctx).toContain('ทำตามแผนได้ 50%')
    expect(ctx).toContain('TGAT ขาด 30')
    expect(ctx).toContain('TGAT 60 นาที')
  })
  it('copes with an empty profile', () => {
    const empty = buildSecretaryContext({ target: {}, scores: [], tasks: [], readLog: {} }, '2027-01-01')
    expect(empty).toContain('ยังไม่ได้ตั้งเป้าหมาย')
    expect(empty).toContain('วันนี้ไม่มีงานในแผน')
  })
})

describe('prompt + ask', () => {
  it('keeps only the last 6 turns', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'ai' : 'user', text: `m${i}` }))
    const prompt = buildSecretaryPrompt({ question: 'ถามหน่อย', history, context: 'ctx' })
    expect(prompt).not.toContain('m3')
    expect(prompt).toContain('m4')
    expect(prompt).toContain('น้อง: ถามหน่อย')
  })
  it('returns the model text, with a fallback when empty', async () => {
    expect(await askSecretary({ question: 'q', context: 'c' }, { generate: async () => '  สู้ๆ นะน้อง ' })).toBe('สู้ๆ นะน้อง')
    expect(await askSecretary({ question: 'q', context: 'c' }, { generate: async () => '   ' })).toContain('ตอบไม่ได้')
  })
})
