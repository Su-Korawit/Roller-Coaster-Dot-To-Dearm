import { describe, it, expect } from 'vitest'
import { splitSlug, parseUniversities, parseFaculties, parseDepartments, parseDepartment } from './tcasinParse'

describe('splitSlug', () => {
  it('splits name and numeric id, decoding percent-encoding', () => {
    expect(splitSlug('%E0%B8%88%E0%B8%B8%E0%B8%AC%E0%B8%B2.1/')).toEqual({ id: '1', name: 'จุฬา' })
    expect(splitSlug('คณะวิศวกรรมศาสตร์.111')).toEqual({ id: '111', name: 'คณะวิศวกรรมศาสตร์' })
    expect(splitSlug('no-id')).toBeNull()
    expect(splitSlug('name.abc')).toBeNull()
  })
})

describe('list parsers', () => {
  it('universities, de-duplicated', () => {
    const html = '<a href="/search/uni/จุฬาลงกรณ์มหาวิทยาลัย.1/">x</a><a href="/search/uni/จุฬาลงกรณ์มหาวิทยาลัย.1/">y</a><a href="/search/uni/มหาวิทยาลัยเกษตรศาสตร์.2/">z</a>'
    expect(parseUniversities(html)).toEqual([
      { id: '1', slug: 'จุฬาลงกรณ์มหาวิทยาลัย.1', name: 'จุฬาลงกรณ์มหาวิทยาลัย' },
      { id: '2', slug: 'มหาวิทยาลัยเกษตรศาสตร์.2', name: 'มหาวิทยาลัยเกษตรศาสตร์' },
    ])
  })
  it('faculties belong to a university path', () => {
    const html = '<a href="/search/uni/ม.2/fac/คณะวิศวกรรมศาสตร์.111/">a</a><a href="/search/uni/ม.2/">no</a>'
    expect(parseFaculties(html)).toEqual([{ id: '111', slug: 'คณะวิศวกรรมศาสตร์.111', name: 'คณะวิศวกรรมศาสตร์' }])
  })
  it('departments get a readable name from the slug', () => {
    const html = '<a href="/department/วิศวกรรมคอมพิวเตอร์-วศ-บ-ภาษาไทย-ปกติ.3340/">a</a>'
    expect(parseDepartments(html)).toEqual([{ id: '3340', slug: 'วิศวกรรมคอมพิวเตอร์-วศ-บ-ภาษาไทย-ปกติ.3340', name: 'วิศวกรรมคอมพิวเตอร์ วศ บ ภาษาไทย ปกติ' }])
  })
})

describe('parseDepartment', () => {
  const html = `<title>ข้อมูล TCAS | TCAS Starter</title><div><h3>รอบ Admission</h3>
    <span>จำนวนที่รับ</span> <b>45 ที่นั่ง</b> วิชาที่กำหนดใช้ <th>สัดส่วน</th>
    <td>TGAT1</td><td>50 %</td><td>TPAT3</td><td>50 %</td> คะแนนขั้นต่ำที่กำหนด ไม่ต่ำกว่า TGAT 1</div>`
  it('reads seats and weighted subjects of round 3', () => {
    const d = parseDepartment(html)
    expect(d.seats).toBe(45)
    expect(d.subjects).toEqual([{ label: 'TGAT1', weight: 50 }, { label: 'TPAT3', weight: 50 }])
  })
  it('copes with a page without round 3', () => {
    expect(parseDepartment('<title>x</title><p>รอบ Portfolio</p>')).toEqual({ title: 'x', seats: null, subjects: [] })
  })
})
