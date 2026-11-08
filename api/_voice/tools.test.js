import { describe, it, expect } from 'vitest'
import { runTool, resolveDate, shift } from './tools.js'

const NOW = Date.UTC(2026, 10, 8, 5, 0, 0) // Sun 8 Nov 2026 12:00 BKK
const TODAY = '2026-11-08'
const t = (id, text, date, done = false) => ({ id, text, tag: 'อื่นๆ', date, done })
const run = (name, args, os) => runTool(name, args, { os, now: NOW, newId: () => 'new1' })

describe('resolveDate', () => {
  it('understands words, offsets and ISO dates', () => {
    expect(resolveDate(undefined, TODAY)).toBe(TODAY)
    expect(resolveDate('พรุ่งนี้', TODAY)).toBe('2026-11-09')
    expect(resolveDate('tomorrow', TODAY)).toBe('2026-11-09')
    expect(resolveDate('+3', TODAY)).toBe('2026-11-11')
    expect(resolveDate('2026-12-01', TODAY)).toBe('2026-12-01')
    expect(resolveDate('2026-02-31', TODAY)).toBeNull()
    expect(resolveDate('next week', TODAY)).toBeNull()
  })
  it('shift crosses month ends', () => {
    expect(shift('2026-11-30', 1)).toBe('2026-12-01')
  })
})

describe('get_schedule', () => {
  const os = { tasks: [t('a', 'อ่านชีวะ บทที่ 3', TODAY), t('b', 'ทำโจทย์ฟิสิกส์', TODAY, true), t('c', 'อ่านเคมี', '2026-11-09')] }
  it('lists open and done tasks of today', () => {
    const r = run('get_schedule', {}, os)
    expect(r.message).toContain('ยังไม่ทำ 1')
    expect(r.message).toContain('อ่านชีวะ')
    expect(r.message).toContain('ทำแล้ว 1')
    expect(r.tasks).toBeUndefined()
  })
  it('reads another day', () => {
    expect(run('get_schedule', { date: 'tomorrow' }, os).message).toContain('อ่านเคมี')
  })
  it('says so when the day is empty', () => {
    expect(run('get_schedule', { date: '+5' }, os).message).toContain('ยังไม่มีงาน')
  })
})

describe('get_admission_news', () => {
  it('lists upcoming TCAS dates and always points to mytcas.com', () => {
    const r = run('get_admission_news', { days: 120 }, {})
    expect(r.message).toMatch(/อีก \d+ วัน/)
    expect(r.message).toContain('mytcas.com')
  })
  it('handles an empty window', () => {
    const far = runTool('get_admission_news', { days: 7 }, { os: {}, now: Date.UTC(2028, 0, 1) })
    expect(far.message).toContain('ยังไม่มีวันสำคัญ')
  })
})

describe('add_task', () => {
  it('appends a task for today and tags it as voice', () => {
    const r = run('add_task', { text: '  ทบทวน TGAT  ' }, { tasks: [] })
    expect(r.tasks).toEqual([{ id: 'new1', text: 'ทบทวน TGAT', tag: 'อื่นๆ', date: TODAY, done: false, by: 'voice' }])
  })
  it('refuses empty text, past dates and duplicates', () => {
    expect(run('add_task', { text: '   ' }, { tasks: [] }).tasks).toBeUndefined()
    expect(run('add_task', { text: 'x', date: '2026-11-01' }, { tasks: [] }).tasks).toBeUndefined()
    const dup = run('add_task', { text: 'อ่านชีวะ' }, { tasks: [t('a', 'อ่านชีวะ', TODAY)] })
    expect(dup.tasks).toBeUndefined()
    expect(dup.message).toContain('อยู่แล้ว')
  })
  it('caps the list size', () => {
    const many = Array.from({ length: 400 }, (_, i) => t(`i${i}`, `งาน${i}`, TODAY))
    expect(run('add_task', { text: 'อีกงาน' }, { tasks: many }).tasks).toBeUndefined()
  })
})

describe('move_tasks', () => {
  const os = { tasks: [t('a', 'อ่านชีวะ', TODAY), t('b', 'อ่านเคมี', TODAY), t('c', 'เสร็จแล้ว', TODAY, true)] }
  it('moves every open task of today when no name is given', () => {
    const r = run('move_tasks', { to_date: 'tomorrow' }, os)
    expect(r.tasks.map((x) => x.date)).toEqual(['2026-11-09', '2026-11-09', TODAY])
  })
  it('moves one task by name', () => {
    const r = run('move_tasks', { to_date: '+2', text: 'เคมี' }, os)
    expect(r.tasks.find((x) => x.id === 'b').date).toBe('2026-11-10')
    expect(r.tasks.find((x) => x.id === 'a').date).toBe(TODAY)
  })
  it('asks which one when the name is ambiguous, and refuses the past', () => {
    const amb = run('move_tasks', { to_date: 'tomorrow', text: 'อ่าน' }, os)
    expect(amb.tasks).toBeUndefined()
    expect(amb.message).toContain('หลายงาน')
    expect(run('move_tasks', { to_date: '2026-11-01' }, os).tasks).toBeUndefined()
  })
})

describe('complete_task', () => {
  it('ticks the single matching open task', () => {
    const r = run('complete_task', { text: 'ชีวะ' }, { tasks: [t('a', 'อ่านชีวะ', TODAY)] })
    expect(r.tasks[0].done).toBe(true)
  })
  it('does nothing when there is no match', () => {
    expect(run('complete_task', { text: 'ศิลปะ' }, { tasks: [t('a', 'อ่านชีวะ', TODAY)] }).tasks).toBeUndefined()
  })
})

describe('unknown tool', () => {
  it('is refused without changes', () => {
    expect(run('delete_everything', {}, { tasks: [t('a', 'x', TODAY)] }).tasks).toBeUndefined()
  })
})
