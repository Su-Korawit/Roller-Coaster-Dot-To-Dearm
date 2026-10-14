import { describe, it, expect } from 'vitest'
import { formatDuration, formatVerified, formatWeekLeft, focusMessage } from './formatFocus'

describe('formatDuration', () => {
  it('formats mm:ss under an hour and h:mm:ss above', () => {
    expect(formatDuration(83_000)).toBe('01:23')
    expect(formatDuration(3_725_000)).toBe('1:02:05')
    expect(formatDuration(0)).toBe('00:00')
  })
  it('clamps negatives', () => {
    expect(formatDuration(-5000)).toBe('00:00')
  })
})

describe('formatVerified', () => {
  it('uses Thai units and drops empty parts', () => {
    expect(formatVerified(95 * 60000)).toBe('1 ชม. 35 นาที')
    expect(formatVerified(120 * 60000)).toBe('2 ชม.')
    expect(formatVerified(7 * 60000)).toBe('7 นาที')
    expect(formatVerified(0)).toBe('0 นาที')
  })
})

describe('formatWeekLeft', () => {
  const now = 1_000_000
  it('counts days+hours, then hours+minutes, then minutes', () => {
    expect(formatWeekLeft(now + 3 * 86_400_000 + 4 * 3_600_000, now)).toBe('เหลืออีก 3 วัน 4 ชม.')
    expect(formatWeekLeft(now + 5 * 3_600_000 + 30 * 60_000, now)).toBe('เหลืออีก 5 ชม. 30 นาที')
    expect(formatWeekLeft(now + 12 * 60_000, now)).toBe('เหลืออีก 12 นาที')
  })
  it('says the week is over once the end has passed', () => {
    expect(formatWeekLeft(now - 1, now)).toBe('สรุปผลสัปดาห์นี้แล้ว')
  })
})

describe('focusMessage', () => {
  it('explains a lapsed gap, a capped day and known errors; stays silent otherwise', () => {
    expect(focusMessage({ lapsed: true })).toContain('ไม่นับ')
    expect(focusMessage({ capped: true })).toContain('8 ชั่วโมง')
    expect(focusMessage(null, 'NO_ACTIVE_SESSION')).toContain('เริ่มใหม่')
    expect(focusMessage(null, 'boom')).toContain('ลองใหม่')
    expect(focusMessage({ creditedMs: 60000 })).toBeNull()
    expect(focusMessage({ tooSoon: true })).toBeNull()
  })
})
