import { describe, it, expect } from 'vitest'
import { BUILDINGS, BUILDING_BY_ID, ZONES } from '../constants/openHouseBuildings'
import {
  splitGroup90, classifyBuilding, dedupePrograms, thaiNormalize, summariseRounds, summariseBuilding,
  filterUniversities, universityTypes, seatsFor,
} from './openHouseIndex'

const row = (over = {}) => ({
  program_id: 'p1', program_name_th: 'หลักสูตร', field_name_th: 'สาขา', faculty_name_th: 'คณะ', group_field_id: '10',
  university_id: 'u1', major_id: '0', ...over,
})

describe('buildings table', () => {
  it('has the 18 buildings with a name, a known zone and a source group', () => {
    expect(BUILDINGS).toHaveLength(18)
    expect(new Set(BUILDINGS.map((b) => b.id)).size).toBe(18)
    for (const b of BUILDINGS) {
      expect(b.nameTh.length).toBeGreaterThan(0)
      expect(ZONES[b.zone], b.id).toBeTruthy()
      expect(b.group).toMatch(/^\d{2}$/)
    }
    expect(BUILDING_BY_ID.med.group).toBe('10')
  })
})

describe('classifyBuilding', () => {
  it.each([
    ['10', 'med'], ['11', 'allied'], ['12', 'dent'], ['13', 'pharm'], ['14', 'vet'], ['21', 'sci'], ['22', 'it'],
    ['30', 'eng'], ['40', 'arch'], ['50', 'agri'], ['61', 'biz'], ['62', 'tour'], ['70', 'edu'], ['80', 'fine'],
  ])('group %s → %s', (group, id) => expect(classifyBuilding(row({ group_field_id: group }))).toBe(id))

  it('accepts a numeric group id', () => {
    expect(classifyBuilding(row({ group_field_id: 30 }))).toBe('eng')
  })

  it('splits group 90 by the field/program/faculty names', () => {
    expect(classifyBuilding(row({ group_field_id: '90', field_name_th: 'นิติศาสตร์' }))).toBe('law')
    expect(classifyBuilding(row({ group_field_id: '90', field_name_th: 'นิเทศศาสตร์' }))).toBe('comm')
  })

  it('returns null for a group that has no building, and never throws on junk', () => {
    expect(classifyBuilding(row({ group_field_id: '99' }))).toBeNull()
    expect(classifyBuilding(row({ group_field_id: undefined }))).toBeNull()
    expect(classifyBuilding(null)).toBeNull()
    expect(classifyBuilding({})).toBeNull()
  })
})

describe('splitGroup90', () => {
  it.each([
    [{ fieldName: 'นิติศาสตร์' }, 'law'],
    [{ fieldName: 'กฎหมายธุรกิจ' }, 'law'],
    [{ fieldName: 'นิเทศศาสตร์' }, 'comm'],
    [{ fieldName: 'การสื่อสารมวลชน' }, 'comm'],
    [{ fieldName: 'รัฐศาสตร์' }, 'pol'],
    [{ fieldName: 'สังคมวิทยาและมานุษยวิทยา' }, 'pol'],
    [{ fieldName: 'ภาษาญี่ปุ่น' }, 'hum'],
    [{ fieldName: 'ภาษาอังกฤษ' }, 'hum'],
    [{ fieldName: 'ปรัชญา' }, 'hum'],
  ])('field %j → %s', (input, id) => expect(splitGroup90(input)).toBe(id))

  it('rule order is law, then comm, then pol, when several match', () => {
    expect(splitGroup90({ fieldName: 'นิติศาสตร์และนิเทศศาสตร์' })).toBe('law')
    expect(splitGroup90({ fieldName: 'การสื่อสารทางการเมือง รัฐศาสตร์' })).toBe('comm')
  })

  it('a language field goes to the humanities, even though its name has no building keyword', () => {
    expect(splitGroup90({ fieldName: 'ภาษาจีน', programName: 'ภาษาจีนธุรกิจ' })).toBe('hum')
  })

  it('falls back to the program and faculty names when the field name says nothing', () => {
    expect(splitGroup90({ fieldName: 'สาขาวิชาอื่น', programName: 'นิติศาสตรบัณฑิต', facultyName: '' })).toBe('law')
    expect(splitGroup90({ fieldName: 'สาขาวิชาอื่น', programName: '', facultyName: 'คณะรัฐศาสตร์' })).toBe('pol')
  })

  it('defaults to hum for empty or missing names', () => {
    expect(splitGroup90({})).toBe('hum')
    expect(splitGroup90({ fieldName: '', programName: '', facultyName: '' })).toBe('hum')
    expect(splitGroup90(undefined)).toBe('hum')
  })
})

describe('dedupePrograms', () => {
  it('keeps one row per program_id and merges the majors that differ', () => {
    const out = dedupePrograms([
      row({ program_id: 'a', major_id: '1', major_name_th: 'ก' }),
      row({ program_id: 'a', major_id: '2', major_name_th: 'ข' }),
      row({ program_id: 'a', major_id: '1', major_name_th: 'ก' }),
      row({ program_id: 'b' }),
    ])
    expect(out.map((r) => r.program_id)).toEqual(['a', 'b'])
    expect(out[0].majors.map((m) => m.major_id)).toEqual(['1', '2'])
  })

  it('ignores rows without a program id and non-arrays', () => {
    expect(dedupePrograms([row({ program_id: '' }), null, row({ program_id: 'x' })]).map((r) => r.program_id)).toEqual(['x'])
    expect(dedupePrograms(undefined)).toEqual([])
  })
})

describe('thaiNormalize', () => {
  it('lowercases, drops "มหาวิทยาลัย", tone marks and spaces', () => {
    expect(thaiNormalize('  Chulalongkorn  ')).toBe('chulalongkorn')
    expect(thaiNormalize('มหาวิทยาลัยเชียงใหม่')).toBe('เชียงใหม')
    expect(thaiNormalize('จุฬาลงกรณ์ มหาวิทยาลัย')).toBe(thaiNormalize('จุฬาลงกรณ์มหาวิทยาลัย'))
    expect(thaiNormalize('น้ำ')).toBe(thaiNormalize('นำ'))
  })
  it('never throws on junk', () => {
    expect(thaiNormalize(undefined)).toBe('')
    expect(thaiNormalize(null)).toBe('')
    expect(thaiNormalize(5)).toBe('')
  })
})

const proj = (seats, over = {}) => ({ nameTh: 'โครงการ', seats, minGpax: 2.5, scores: [], interview: false, link: null, ...over })
const prog = (id, rounds, over = {}) => ({ programId: id, nameTh: `หลักสูตร ${id}`, typeTh: 'ปกติ', costText: '30,000/ภาค', rounds, ...over })
const uni = (id, name, typeTh, programs) => ({ id, nameTh: name, typeTh, logoUrl: `https://x/${id}.png`, programs })

const DATA = [
  uni('cu', 'จุฬาลงกรณ์มหาวิทยาลัย', 'ทปอ.', [prog('a', [{ round: 1, seats: 24, projects: [proj(24)] }, { round: 3, seats: 60, projects: [proj(60)] }])]),
  uni('mu', 'มหาวิทยาลัยมหิดล', 'ทปอ.', [
    prog('b', [{ round: 1, seats: 10, projects: [proj(10)] }]),
    prog('c', [{ round: 1, seats: 30, projects: [proj(30)] }, { round: 2, seats: 5, projects: [proj(5)] }]),
  ]),
  uni('nu', 'มหาวิทยาลัยนเรศวร', 'ทปอ.', [prog('d', [{ round: 2, seats: 32, projects: [proj(32)] }])]),
  uni('rb', 'มหาวิทยาลัยราชภัฏบ้านสมเด็จ', 'ราชภัฏ', [prog('e', [])]),
]

describe('summariseRounds / summariseBuilding', () => {
  it('counts universities and seats per round, a university once however many programs it has', () => {
    expect(summariseRounds(DATA)).toEqual({
      1: { universities: 2, seats: 64 },
      2: { universities: 2, seats: 37 },
      3: { universities: 1, seats: 60 },
      4: { universities: 0, seats: 0 },
    })
  })
  it('counts universities and programs of a building', () => {
    expect(summariseBuilding(DATA)).toEqual({ universities: 4, programs: 5 })
  })
  it('handles an empty or missing list', () => {
    expect(summariseRounds([])).toEqual({ 1: { universities: 0, seats: 0 }, 2: { universities: 0, seats: 0 }, 3: { universities: 0, seats: 0 }, 4: { universities: 0, seats: 0 } })
    expect(summariseBuilding(undefined)).toEqual({ universities: 0, programs: 0 })
  })
})

describe('filterUniversities', () => {
  const names = (list) => list.map((u) => u.id)

  it('keeps only the universities that have entries in the selected round', () => {
    expect(names(filterUniversities(DATA, { round: 2 }))).toEqual(['nu', 'mu']) // most seats first by default
    expect(names(filterUniversities(DATA, { round: 4 }))).toEqual([])
  })

  it('and only the programs of that round inside them', () => {
    const mu = filterUniversities(DATA, { round: 2 }).find((u) => u.id === 'mu')
    expect(mu.programs.map((p) => p.programId)).toEqual(['c'])
  })

  it('searches university and program names, Thai-normalised', () => {
    expect(names(filterUniversities(DATA, { round: 1, query: 'จุฬา' }))).toEqual(['cu'])
    expect(names(filterUniversities(DATA, { round: 1, query: 'หลักสูตร c' }))).toEqual(['mu'])
    expect(names(filterUniversities(DATA, { round: 1, query: 'มหิดล' }))).toEqual(['mu'])
  })

  it('treats search text literally (regex characters, empty, whitespace)', () => {
    expect(names(filterUniversities(DATA, { round: 1, query: '(.*)' }))).toEqual([])
    expect(names(filterUniversities(DATA, { round: 1, query: '[' }))).toEqual([])
    expect(names(filterUniversities(DATA, { round: 1, query: '   ' }))).toEqual(['mu', 'cu'])
  })

  it('filters by university type', () => {
    expect(names(filterUniversities(DATA, { round: 2, types: ['ทปอ.'] }))).toEqual(['nu', 'mu'])
    expect(names(filterUniversities(DATA, { round: 2, types: ['ราชภัฏ'] }))).toEqual([])
  })

  it('sorts by seats (default), name or program count', () => {
    expect(names(filterUniversities(DATA, { round: 1, sort: 'seats' }))).toEqual(['mu', 'cu'])
    expect(names(filterUniversities(DATA, { round: 1, sort: 'programs' }))).toEqual(['mu', 'cu'])
    expect(names(filterUniversities(DATA, { round: 2, sort: 'name' }))).toEqual(['nu', 'mu']) // นเรศวร before มหิดล
  })

  it('does not mutate its input and tolerates junk', () => {
    const before = JSON.stringify(DATA)
    filterUniversities(DATA, { round: 1, sort: 'name' })
    expect(JSON.stringify(DATA)).toBe(before)
    expect(filterUniversities(undefined, { round: 1 })).toEqual([])
    expect(filterUniversities(DATA, undefined)).toHaveLength(3)
  })
})

describe('universityTypes / seatsFor', () => {
  it('lists the university types by how many universities have them', () => {
    expect(universityTypes(DATA)).toEqual(['ทปอ.', 'ราชภัฏ'])
    expect(universityTypes(undefined)).toEqual([])
  })
  it('sums a university’s seats in one round', () => {
    expect(seatsFor(DATA[1], 1)).toBe(40)
    expect(seatsFor(DATA[1], 3)).toBe(0)
  })
})
