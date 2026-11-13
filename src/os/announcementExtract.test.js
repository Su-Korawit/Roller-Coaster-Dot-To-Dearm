import { describe, it, expect } from 'vitest'
import { htmlToText, listsUnder, findFee, findDates, extractAnnouncement, itemId, isSpecificPage } from './announcementExtract'

const NL = String.fromCharCode(10)
const page = [
  '<h2>เอกสารที่ใช้สมัคร</h2><ul><li>สำเนาบัตรประชาชน</li><li>ใบแสดงผลการเรียน (ปพ.1)</li><li>แฟ้มสะสมผลงาน</li></ul>',
  '<h2>คุณสมบัติผู้สมัคร</h2><ol><li>กำลังศึกษาชั้น ม.6</li><li>GPAX ไม่ต่ำกว่า 3.00</li></ol>',
  '<p>ค่าสมัคร 300 บาท</p><p>รับสมัครวันที่ 1-15 ธ.ค. 2569</p><p>สอบสัมภาษณ์ 20 ม.ค. 2570</p>',
].join('')

describe('htmlToText', () => {
  it('keeps list items on their own lines and drops scripts', () => {
    const t = htmlToText('<script>x()</script><ul><li>ก</li><li>ข &amp; ค</li></ul>')
    expect(t.split(NL)).toEqual(['• ก', '• ข & ค'])
  })
})

describe('extractAnnouncement', () => {
  const ex = extractAnnouncement(htmlToText(page))
  it('reads a labelled documents list and eligibility list', () => {
    const docs = ex.groups.find((g) => g.id === 'xdocs')
    expect(docs.items.map((i) => i.t)).toEqual(['สำเนาบัตรประชาชน', 'ใบแสดงผลการเรียน (ปพ.1)', 'แฟ้มสะสมผลงาน'])
    expect(docs.items[0].ref).toContain('เอกสาร')
    expect(ex.groups.find((g) => g.id === 'xelig').items).toHaveLength(2)
  })
  it('reads the fee and the dated lines', () => {
    const info = ex.groups.find((g) => g.id === 'xinfo').items.map((i) => i.t)
    expect(info).toContain('ค่าสมัคร 300 บาท')
    expect(info.some((t) => t.includes('สอบสัมภาษณ์'))).toBe(true)
  })
  it('returns null when nothing is clearly stated', () => {
    expect(extractAnnouncement('ยินดีต้อนรับสู่เว็บไซต์ของเรา' + NL + 'ข่าวประชาสัมพันธ์')).toBeNull()
  })
})

describe('helpers', () => {
  it('ignores a one-item list and "เช่น" lead-ins', () => {
    expect(listsUnder(['เอกสารที่ใช้สมัคร', '• สำเนาบัตร'].join(NL), /^เอกสารที่ใช้สมัคร$/)).toEqual([])
    const l = listsUnder(['เอกสารที่ใช้สมัคร', '• เอกสารตามที่กำหนด เช่น', '• สำเนาบัตร', '• ใบ ปพ.1'].join(NL), /^เอกสารที่ใช้สมัคร$/)
    expect(l[0].lines).toEqual(['สำเนาบัตร', 'ใบ ปพ.1'])
  })
  it('gives no fee when amounts conflict', () => {
    expect(findFee('ค่าสมัคร 200 บาท' + NL + 'ค่าสมัคร 500 บาท')).toBeNull()
    expect(findFee('ค่าธรรมเนียมการสมัคร 1,000 บาท').amount).toBe('1000')
  })
  it('finds apply/interview dates', () => {
    expect(findDates('รับสมัคร 1 พ.ย. 2569').map((d) => d.kind)).toEqual(['apply'])
    expect(findDates('ไม่มีวันที่')).toEqual([])
    expect(findDates('calendar_month เปิดรับสมัคร : 19 ต.ค. 2569 - 19 พ.ย. 2569')[0].line).toBe('เปิดรับสมัคร : 19 ต.ค. 2569 - 19 พ.ย. 2569')
    expect(findDates('รับสมัคร 1 พ.ย. 2566')).toEqual([])
    expect(findDates('สมัครออนไลน์ | 1 พ.ย. 2569 | 14 ก.พ. 2570')).toEqual([])
  })
  it('gives stable ids that change with the text', () => {
    expect(itemId('docs', 'สำเนา บัตร')).toBe(itemId('docs', 'สำเนาบัตร'))
    expect(itemId('docs', 'ก')).not.toBe(itemId('docs', 'ข'))
  })
  it('treats portals and widely shared links as not specific', () => {
    expect(isSpecificPage('https://admission.ku.ac.th/', 10)).toBe(false)
    expect(isSpecificPage('https://x.ac.th/a/b', 500)).toBe(false)
    expect(isSpecificPage('https://x.ac.th/a/b', 3)).toBe(true)
  })
})
