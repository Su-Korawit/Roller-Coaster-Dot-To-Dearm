// Pure Open House index logic, shared by scripts/refreshOpenHouseIndex.mjs and the popup.
// No I/O, never throws on malformed rows.
import { BUILDINGS } from '../constants/openHouseBuildings.js'

const ROUNDS = [1, 2, 3, 4]

// Group 90 (humanities and social sciences) is split by keywords: law, then comm, then pol.
const RULES = [
  ['law', ['นิติ', 'กฎหมาย', 'ยุติธรรม']],
  ['comm', ['นิเทศ', 'สื่อสาร', 'วารสาร', 'สื่อมวลชน', 'ภาพยนตร์', 'โฆษณา', 'ประชาสัมพันธ์', 'วิทยุ', 'โทรทัศน์', 'ดิจิทัลมีเดีย']],
  ['pol', ['รัฐศาสตร์', 'รัฐประศาสน', 'การเมือง', 'การปกครอง', 'สังคมศาสตร์', 'สังคมวิทยา', 'มานุษยวิทยา', 'ความสัมพันธ์ระหว่างประเทศ', 'พัฒนาสังคม', 'สังคมสงเคราะห์', 'อาเซียน']],
]
const LANGUAGES = ['ภาษา', 'อังกฤษ', 'จีน', 'ญี่ปุ่น', 'เกาหลี', 'ฝรั่งเศส', 'เยอรมัน', 'รัสเซีย', 'สเปน', 'อิตาลี', 'อาหรับ', 'มลายู', 'ฮินดี', 'เวียดนาม', 'พม่า', 'บาลี', 'สันสกฤต']

const text = (v) => (typeof v === 'string' ? v : '')
const hasAny = (haystack, words) => words.some((w) => haystack.includes(w))
const firstRule = (haystack) => RULES.find(([, words]) => hasAny(haystack, words))?.[0] ?? null

export function splitGroup90({ fieldName, programName, facultyName } = {}) {
  const field = text(fieldName)
  const byField = firstRule(field)
  if (byField) return byField
  if (hasAny(field, LANGUAGES)) return 'hum'
  return firstRule(`${text(programName)} ${text(facultyName)}`) ?? 'hum'
}

const BY_GROUP = Object.fromEntries(BUILDINGS.filter((b) => b.group !== '90').map((b) => [b.group, b.id]))

// The building a course row belongs to, or null when its group has none.
export function classifyBuilding(row) {
  if (!row || typeof row !== 'object') return null
  const group = String(row.group_field_id ?? '')
  if (group === '90') return splitGroup90({ fieldName: row.field_name_th, programName: row.program_name_th, facultyName: row.faculty_name_th })
  return BY_GROUP[group] ?? null
}

// MyTCAS repeats rows per major: one row per program_id, majors merged by major_id.
export function dedupePrograms(rows) {
  const byId = new Map()
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || typeof r.program_id !== 'string' || !r.program_id) continue
    const hit = byId.get(r.program_id) ?? { ...r, majors: [] }
    if (r.major_id && r.major_id !== '0' && r.major_name_th && !hit.majors.some((m) => m.major_id === r.major_id)) {
      hit.majors.push({ major_id: r.major_id, major_name_th: r.major_name_th })
    }
    byId.set(r.program_id, hit)
  }
  return [...byId.values()]
}

// Search form of a Thai/English name: lowercase, no "มหาวิทยาลัย", no spaces or tone marks.
export function thaiNormalize(value) {
  if (typeof value !== 'string') return ''
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/มหาวิทยาลัย/g, '')
    .replace(/[\u0E48-\u0E4C\u200B\s]+/g, '')
}

const projectsOf = (program, round) => program.rounds?.find((r) => r.round === round)?.projects ?? []
const seatsOf = (program, round) => Number(program.rounds?.find((r) => r.round === round)?.seats ?? 0)

export function seatsFor(university, round) {
  return (university?.programs ?? []).reduce((n, p) => n + (round ? seatsOf(p, round) : (p.rounds ?? []).reduce((m, r) => m + Number(r.seats ?? 0), 0)), 0)
}

// Per round: how many universities have entries and the seats in total.
export function summariseRounds(universities) {
  const out = Object.fromEntries(ROUNDS.map((r) => [r, { universities: 0, seats: 0 }]))
  for (const u of Array.isArray(universities) ? universities : []) {
    for (const round of ROUNDS) {
      const programs = (u.programs ?? []).filter((p) => projectsOf(p, round).length > 0)
      if (programs.length === 0) continue
      out[round].universities += 1
      out[round].seats += programs.reduce((n, p) => n + seatsOf(p, round), 0)
    }
  }
  return out
}

export function summariseBuilding(universities) {
  const list = Array.isArray(universities) ? universities : []
  return { universities: list.length, programs: list.reduce((n, u) => n + (u.programs?.length ?? 0), 0) }
}

export function universityTypes(universities) {
  const counts = new Map()
  for (const u of Array.isArray(universities) ? universities : []) {
    if (u.typeTh) counts.set(u.typeTh, (counts.get(u.typeTh) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th')).map(([t]) => t)
}

// The popup list: only universities with entries in the round (any round when none is given),
// programs narrowed to match, then sorted. Search is a literal substring of the normalised names.
export function filterUniversities(universities, { query = '', types = [], round, sort = 'seats' } = {}) {
  const q = thaiNormalize(query)
  const out = []
  for (const u of Array.isArray(universities) ? universities : []) {
    if (types.length > 0 && !types.includes(u.typeTh)) continue
    const uniMatch = q === '' || thaiNormalize(u.nameTh).includes(q)
    const programs = (u.programs ?? []).filter((p) => {
      const inRound = round ? projectsOf(p, round).length > 0 : (p.rounds ?? []).some((r) => (r.projects ?? []).length > 0)
      return inRound && (uniMatch || thaiNormalize(p.nameTh).includes(q))
    })
    if (programs.length > 0) out.push({ ...u, programs })
  }
  const byName = (a, b) => thaiNormalize(a.nameTh).localeCompare(thaiNormalize(b.nameTh), 'th')
  const sorters = {
    name: byName,
    programs: (a, b) => b.programs.length - a.programs.length || byName(a, b),
    seats: (a, b) => seatsFor(b, round) - seatsFor(a, round) || byName(a, b),
  }
  return out.sort(sorters[sort] ?? sorters.seats)
}
