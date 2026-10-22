import { describe, it, expect } from 'vitest'
import { thaiShortDate, daysText } from './thaiDate'

describe('thaiShortDate', () => {
  it.each([
    ['2027-01-30', '30 ม.ค.'], ['2027-02-01', '1 ก.พ.'], ['2027-03-13', '13 มี.ค.'], ['2027-04-20', '20 เม.ย.'],
    ['2027-05-07', '7 พ.ค.'], ['2027-06-07', '7 มิ.ย.'], ['2026-07-15', '15 ก.ค.'], ['2026-08-15', '15 ส.ค.'],
    ['2026-09-01', '1 ก.ย.'], ['2026-10-14', '14 ต.ค.'], ['2026-11-15', '15 พ.ย.'], ['2026-12-31', '31 ธ.ค.'],
  ])('%s → %s', (iso, text) => expect(thaiShortDate(iso)).toBe(text))

  it('gives an empty string for junk instead of throwing', () => {
    for (const bad of [undefined, null, '', 'abc', '2027-13-01', '2027-00-10', 5]) expect(thaiShortDate(bad)).toBe('')
  })
})

describe('daysText', () => {
  it('says today, tomorrow and N days', () => {
    expect(daysText(0)).toBe('วันนี้')
    expect(daysText(1)).toBe('พรุ่งนี้')
    expect(daysText(30)).toBe('อีก 30 วัน')
  })
  it('never shows a negative or missing count', () => {
    expect(daysText(-3)).toBe('')
    expect(daysText(null)).toBe('')
    expect(daysText(undefined)).toBe('')
  })
})
