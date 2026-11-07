import { describe, it, expect } from 'vitest'
import { buildStudentContext } from './context.js'
import { SECRETARIES } from '../../src/constants/secretaries.js'
import { secretaryName } from './persona.js'

const NOW = Date.UTC(2026, 10, 6, 5, 0, 0)   // 6 Nov 2026 12:00 BKK

describe('buildStudentContext', () => {
  it('is empty without data', () => {
    expect(buildStudentContext(null, NOW)).toBe('')
    expect(buildStudentContext('x', NOW)).toBe('')
  })
  it('summarises goal, days left, today and progress from the synced plan only', () => {
    const os = {
      target: { university: 'ม.เกษตร', faculty: 'วิทยาศาสตร์', major: 'คอมพิวเตอร์', examDate: '2026-11-16', note: 'ความลับ' },
      scores: [{ subject: 'TGAT1' }, { subject: 'TPAT3' }],
      tasks: [
        { date: '2026-11-06', text: 'ทำข้อสอบ TPAT3', done: false, auto: true, minutes: 60 },
        { date: '2026-11-06', text: 'อ่าน TGAT1', done: true, auto: true, minutes: 60 },
      ],
      readLog: { '2026-11-06': 45, '2026-11-04': 30 },
      mood: 'ห้ามส่ง',
    }
    const c = buildStudentContext(os, NOW)
    expect(c).toContain('เป้าหมาย: ม.เกษตร / วิทยาศาสตร์ / คอมพิวเตอร์')
    expect(c).toContain('เหลืออีก 10 วัน')
    expect(c).toContain('TGAT1, TPAT3')
    expect(c).toContain('ยังไม่ทำ 1 จาก 2: ทำข้อสอบ TPAT3')
    expect(c).toContain('ทำตามแผนได้ 50%')
    expect(c).toContain('75 นาที')
    expect(c).not.toContain('ความลับ')
    expect(c).not.toContain('ห้ามส่ง')
  })
})

describe('secretaries', () => {
  it('server names match the client list and every secretary is a woman-named พี่', () => {
    for (const s of SECRETARIES) {
      expect(secretaryName(s.id)).toBe(s.name)
      expect(s.name.startsWith('พี่')).toBe(true)
    }
    expect(new Set(SECRETARIES.map((s) => s.id)).size).toBe(SECRETARIES.length)
  })
})
