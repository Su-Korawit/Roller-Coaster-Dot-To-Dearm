import { describe, it, expect } from 'vitest'
import { mergeResume, pickBootTarget, nearestLabel, shouldRecordResume, sanitizeResume, EMPTY_RESUME } from './resumeRules'

const pt = (x, at, label = 'l') => ({ x, y: 1, facing: 'down', label, at })

describe('sanitizeResume', () => {
  it('turns anything unusable into the empty resume and drops bad points', () => {
    expect(sanitizeResume(undefined)).toEqual(EMPTY_RESUME)
    expect(sanitizeResume('x')).toEqual(EMPTY_RESUME)
    const out = sanitizeResume({ last: 'room', points: { room: pt(5, 10), bad: { x: 'a' }, nope: null } })
    expect(Object.keys(out.points)).toEqual(['room'])
    expect(out.last).toBe('room')
  })
  it('clears a last that has no point', () => {
    expect(sanitizeResume({ last: 'ghost', points: { room: pt(1, 1) } }).last).toBe('room')
  })
})

describe('mergeResume', () => {
  it('keeps the newest point per map and points last at the newest overall', () => {
    const local = { last: 'room', points: { room: pt(1, 100), campus: pt(2, 50) } }
    const cloud = { last: 'campus', points: { room: pt(9, 90), campus: pt(8, 120) } }
    const out = mergeResume(local, cloud)
    expect(out.points.room.x).toBe(1)
    expect(out.points.campus.x).toBe(8)
    expect(out.last).toBe('campus')
  })
  it('works when either side is missing', () => {
    expect(mergeResume(null, null)).toEqual(EMPTY_RESUME)
    const only = { last: 'room', points: { room: pt(1, 5) } }
    expect(mergeResume(only, null)).toEqual(only)
    expect(mergeResume(null, only)).toEqual(only)
  })
})

describe('pickBootTarget', () => {
  const ok = (k) => ['room', 'campus'].includes(k)
  it('boots the last map at its point', () => {
    const resume = { last: 'campus', points: { campus: pt(7, 5) } }
    expect(pickBootTarget({ resume, isAllowed: ok, fallbackKey: 'room' })).toEqual({ mapKey: 'campus', point: resume.points.campus })
  })
  it.each([['a retired map', 'test3'], ['an unknown map', 'nowhere'], ['the school hub', 'school_hub']])('falls back to the room for %s', (_n, last) => {
    const resume = { last, points: { [last]: pt(1, 1) } }
    expect(pickBootTarget({ resume, isAllowed: ok, fallbackKey: 'room' })).toEqual({ mapKey: 'room', point: null })
  })
  it('falls back without a resume or without a point for that map', () => {
    expect(pickBootTarget({ resume: null, isAllowed: ok, fallbackKey: 'room' })).toEqual({ mapKey: 'room', point: null })
    expect(pickBootTarget({ resume: { last: 'campus', points: {} }, isAllowed: ok, fallbackKey: 'room' })).toEqual({ mapKey: 'campus', point: null })
  })
})

describe('nearestLabel', () => {
  const zones = [{ x: 0, y: 0, label: 'หน้าตึกแพทย์' }, { x: 300, y: 0, label: 'ห้องสมุด' }]
  it('picks the nearest zone within range', () => {
    expect(nearestLabel(zones, 40, 10, 'ที่โต๊ะ')).toBe('หน้าตึกแพทย์')
    expect(nearestLabel(zones, 280, 0, 'ที่โต๊ะ')).toBe('ห้องสมุด')
  })
  it('uses the fallback beyond 96 px or with no zones', () => {
    expect(nearestLabel(zones, 150, 0, 'ที่โต๊ะ')).toBe('ที่โต๊ะ')
    expect(nearestLabel([], 0, 0, 'ที่โต๊ะ')).toBe('ที่โต๊ะ')
    expect(nearestLabel(undefined, 0, 0, 'ที่โต๊ะ')).toBe('ที่โต๊ะ')
  })
})

describe('shouldRecordResume while visiting (review C1)', () => {
  it('a visit never records a resume point', () => {
    expect(shouldRecordResume(null, true)).toBe(false)
    expect(shouldRecordResume(null, false)).toBe(true)
    expect(shouldRecordResume('campus', true)).toBe(false)
  })
})

describe('shouldRecordResume (review: a pinned page such as /openhouse must not move the boot point of the app)', () => {
  it('records on the normal app and not while the first map is pinned by the page', () => {
    expect(shouldRecordResume(null)).toBe(true)
    expect(shouldRecordResume(undefined)).toBe(true)
    expect(shouldRecordResume('campus')).toBe(false)
  })
})
